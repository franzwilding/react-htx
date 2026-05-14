<?php

declare(strict_types=1);

namespace App\Tests\Preload;

use App\Preload\VitePreloadLinkResolver;
use PHPUnit\Framework\TestCase;

class VitePreloadLinkResolverTest extends TestCase
{
    private string $manifestPath;

    protected function setUp(): void
    {
        $this->manifestPath = sys_get_temp_dir().'/preload-manifest-'.uniqid('', true).'.json';
        file_put_contents($this->manifestPath, json_encode([
            '_chunk-vendor.js' => [
                'file' => 'assets/chunk-vendor.js',
            ],
            '_jsx-runtime.js' => [
                'file' => 'assets/jsx-runtime.js',
                'imports' => ['_chunk-vendor.js'],
            ],
            'assets/app.tsx' => [
                'file' => 'assets/app.js',
                'isEntry' => true,
                'imports' => ['_chunk-vendor.js'],
                'css' => ['assets/app.css'],
            ],
            'assets/components/ui/input.tsx' => [
                'file' => 'assets/input.js',
                'imports' => ['_chunk-vendor.js', 'assets/app.tsx', '_jsx-runtime.js'],
            ],
            'assets/components/ui/radio-group.tsx' => [
                'file' => 'assets/radio-group.js',
                'imports' => ['_chunk-vendor.js', '_jsx-runtime.js'],
            ],
            'assets/components/ui/field.tsx' => [
                'file' => 'assets/field.js',
                'imports' => ['_chunk-vendor.js', '_jsx-runtime.js'],
            ],
            'assets/components/flow/progress.tsx' => [
                'file' => 'assets/progress.js',
                'imports' => ['_chunk-vendor.js', '_jsx-runtime.js'],
            ],
        ], JSON_THROW_ON_ERROR));
    }

    protected function tearDown(): void
    {
        @unlink($this->manifestPath);
    }

    public function testTagResolvesToManifestEntry(): void
    {
        $resolver = $this->createResolver();

        $this->assertSame(
            'assets/components/ui/input.tsx',
            $resolver->manifestKeyFor('ui-input'),
        );
        $this->assertSame(
            'assets/components/flow/progress.tsx',
            $resolver->manifestKeyFor('flow-progress'),
        );
    }

    public function testMultiSegmentTagFallsBackToParentFile(): void
    {
        $resolver = $this->createResolver();

        // No `radio-group-item.tsx` in the manifest → drop trailing segment.
        $this->assertSame(
            'assets/components/ui/radio-group.tsx',
            $resolver->manifestKeyFor('ui-radio-group-item'),
        );

        // No `field-label.tsx` either.
        $this->assertSame(
            'assets/components/ui/field.tsx',
            $resolver->manifestKeyFor('ui-field-label'),
        );
    }

    public function testTagWithoutHyphenIsNotResolved(): void
    {
        $resolver = $this->createResolver();
        $this->assertNull($resolver->manifestKeyFor('div'));
    }

    public function testTagWithUnknownPrefixIsNotResolved(): void
    {
        $resolver = $this->createResolver();
        $this->assertNull($resolver->manifestKeyFor('my-form'));
        $this->assertNull($resolver->manifestKeyFor('mercure-live'));
    }

    public function testLinksFollowTransitiveImports(): void
    {
        $resolver = $this->createResolver();
        $links = $resolver->linksFor(['ui-input']);
        $urls = array_map(fn ($l) => $l->url, $links);
        sort($urls);

        $this->assertSame([
            '/build/assets/app.css',
            '/build/assets/app.js',
            '/build/assets/chunk-vendor.js',
            '/build/assets/input.js',
            '/build/assets/jsx-runtime.js',
        ], $urls);
    }

    public function testLinksDedupAcrossMultipleTags(): void
    {
        $resolver = $this->createResolver();
        $links = $resolver->linksFor(['ui-input', 'ui-field', 'ui-field-label', 'flow-progress']);
        $urls = array_map(fn ($l) => $l->url, $links);

        $this->assertSame(count($urls), count(array_unique($urls)), 'URLs must be deduplicated.');
    }

    public function testCssSidecarsAreEmittedAsPreloadStyle(): void
    {
        $resolver = $this->createResolver();
        $links = $resolver->linksFor(['ui-input']);
        $css = array_values(array_filter($links, fn ($l) => $l->as === 'style'));

        $this->assertCount(1, $css);
        $this->assertSame('/build/assets/app.css', $css[0]->url);
        $this->assertSame('preload', $css[0]->rel);
    }

    public function testJsChunksAreEmittedAsModulepreload(): void
    {
        $resolver = $this->createResolver();
        $links = $resolver->linksFor(['ui-input']);
        foreach ($links as $link) {
            if ($link->url === '/build/assets/app.css') {
                continue;
            }
            $this->assertSame('modulepreload', $link->rel, "JS chunks should use rel=modulepreload, got {$link->rel} for {$link->url}");
            $this->assertNull($link->as);
        }
    }

    public function testEmptyManifestReturnsNoLinks(): void
    {
        $resolver = new VitePreloadLinkResolver(
            '/nonexistent/manifest.json',
            [['prefix' => 'ui-', 'path' => 'assets/components/ui']],
        );

        $this->assertSame([], $resolver->linksFor(['ui-input']));
        $this->assertNull($resolver->manifestKeyFor('ui-input'));
    }

    public function testEmptyTagListReturnsNoLinks(): void
    {
        $resolver = $this->createResolver();
        $this->assertSame([], $resolver->linksFor([]));
    }

    private function createResolver(): VitePreloadLinkResolver
    {
        return new VitePreloadLinkResolver(
            $this->manifestPath,
            [
                ['prefix' => 'ui-', 'path' => 'assets/components/ui'],
                ['prefix' => 'flow-', 'path' => 'assets/components/flow'],
            ],
        );
    }
}

<?php

declare(strict_types=1);

namespace App\Preload;

/**
 * Resolves a kebab-case reactolith tag (e.g. `ui-radio-group-item`) to the
 * concrete JS / CSS asset URLs the browser needs in order to render it.
 *
 * The mapping follows the same rules as reactolith's `createLoader`:
 *
 *   1. Strip the configured prefix from the tag (`ui-input` → `input`).
 *   2. Try `<components_path>/<name>.tsx` in the Vite manifest.
 *   3. If absent, drop the trailing `-segment` and try again — this is the
 *      "multi-segment fallback" that lets `<ui-radio-group-item>` resolve to
 *      `radio-group.tsx` (which exports both `RadioGroup` and `RadioGroupItem`).
 *
 * For every resolved entry the resolver follows the manifest's `imports` and
 * `css` arrays transitively so any shared chunk (`jsx-runtime`, the
 * `_chunk` Vite emits for vendor code) gets preloaded too.
 *
 * The resolver is stateless apart from caching the parsed manifest in memory
 * for the lifetime of the request.
 */
final class VitePreloadLinkResolver
{
    /** @var array<string, array<string, mixed>>|null */
    private ?array $manifest = null;

    /**
     * @param array<array{prefix: string, path: string}> $loaders Module-map
     *        descriptors mirroring the `createLoader({ modules, prefix })`
     *        calls in app.tsx.
     */
    public function __construct(
        private readonly string $manifestPath,
        private readonly array $loaders,
        private readonly string $publicBuildPath = '/build/',
    ) {
    }

    /**
     * Build preload links for the given set of custom-element tag names.
     *
     * @param iterable<string> $tags
     *
     * @return list<PreloadLink>
     */
    public function linksFor(iterable $tags): array
    {
        $manifest = $this->loadManifest();
        if ($manifest === []) {
            return [];
        }

        $entries = [];
        foreach ($tags as $tag) {
            $key = $this->manifestKeyFor($tag);
            if ($key === null) {
                continue;
            }
            $entries[$key] = true;
        }

        $links = [];
        $visited = [];
        foreach (array_keys($entries) as $key) {
            $this->collectFromEntry($key, $links, $visited);
        }

        return array_values($links);
    }

    /**
     * Translate a tag like `ui-radio-group-item` to a manifest key like
     * `assets/components/ui/radio-group.tsx`. Returns null if no loader
     * matches the prefix or no file is found.
     */
    public function manifestKeyFor(string $tag): ?string
    {
        if (!str_contains($tag, '-')) {
            return null; // not a custom element
        }
        $manifest = $this->loadManifest();
        foreach ($this->loaders as $loader) {
            $prefix = $loader['prefix'];
            if ($prefix !== '' && !str_starts_with($tag, $prefix)) {
                continue;
            }
            $name = substr($tag, strlen($prefix));
            $segments = explode('-', $name);
            while ($segments !== []) {
                $candidate = $loader['path'].'/'.implode('-', $segments).'.tsx';
                if (isset($manifest[$candidate])) {
                    return $candidate;
                }
                array_pop($segments);
            }
        }

        return null;
    }

    /**
     * @param array<string, PreloadLink> $links
     * @param array<string, true>        $visited
     */
    private function collectFromEntry(string $key, array &$links, array &$visited): void
    {
        if (isset($visited[$key])) {
            return;
        }
        $visited[$key] = true;
        $manifest = $this->loadManifest();
        $entry = $manifest[$key] ?? null;
        if (!is_array($entry)) {
            return;
        }
        if (isset($entry['file']) && is_string($entry['file'])) {
            $url = $this->publicBuildPath.$entry['file'];
            $links[$url] = new PreloadLink($url, 'modulepreload');
        }
        foreach ($entry['imports'] ?? [] as $importKey) {
            if (is_string($importKey)) {
                $this->collectFromEntry($importKey, $links, $visited);
            }
        }
        foreach ($entry['css'] ?? [] as $css) {
            if (is_string($css)) {
                $url = $this->publicBuildPath.$css;
                $links[$url] = new PreloadLink($url, 'preload', 'style');
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function loadManifest(): array
    {
        if ($this->manifest !== null) {
            return $this->manifest;
        }
        if (!is_file($this->manifestPath)) {
            return $this->manifest = [];
        }
        $contents = file_get_contents($this->manifestPath);
        if ($contents === false) {
            return $this->manifest = [];
        }
        $decoded = json_decode($contents, true);
        $this->manifest = is_array($decoded) ? $decoded : [];

        return $this->manifest;
    }
}

<?php

declare(strict_types=1);

namespace App\Tests\Preload;

use App\Preload\ReactolithPreloadSubscriber;
use App\Preload\VitePreloadLinkResolver;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;

class ReactolithPreloadSubscriberTest extends TestCase
{
    private string $manifestPath;

    protected function setUp(): void
    {
        $this->manifestPath = sys_get_temp_dir().'/preload-sub-'.uniqid('', true).'.json';
        file_put_contents($this->manifestPath, json_encode([
            '_chunk.js' => ['file' => 'assets/chunk.js'],
            'assets/components/ui/input.tsx' => [
                'file' => 'assets/input.js',
                'imports' => ['_chunk.js'],
            ],
            'assets/components/ui/field.tsx' => [
                'file' => 'assets/field.js',
                'imports' => ['_chunk.js'],
            ],
            'assets/components/flow/progress.tsx' => [
                'file' => 'assets/progress.js',
                'imports' => ['_chunk.js'],
            ],
        ], JSON_THROW_ON_ERROR));
    }

    protected function tearDown(): void
    {
        @unlink($this->manifestPath);
    }

    public function testCustomElementTagExtraction(): void
    {
        $subscriber = $this->createSubscriber();
        $tags = $subscriber->extractCustomElementTags(
            '<head></head><body><my-form><ui-field><ui-input/><UI-FIELD-LABEL/></ui-field><ui-progress></ui-progress><div>plain</div></my-form></body>',
        );
        sort($tags);

        $this->assertSame(
            ['flow-progress', 'my-form', 'ui-field', 'ui-field-label', 'ui-input'],
            $tags,
        );
    }

    public function testInjectsLinkTagsIntoHeadForHtmlResponse(): void
    {
        $html = <<<HTML
        <!doctype html>
        <html><head><title>x</title></head>
        <body><my-form><ui-field><ui-input/></ui-field><ui-progress></ui-progress></my-form></body></html>
        HTML;

        $event = $this->makeResponseEvent($html, 'text/html; charset=UTF-8');
        $this->createSubscriber()->onKernelResponse($event);

        $patched = (string) $event->getResponse()->getContent();
        $this->assertStringContainsString(
            '<link rel="modulepreload" href="/build/assets/input.js"',
            $patched,
        );
        $this->assertStringContainsString(
            '<link rel="modulepreload" href="/build/assets/field.js"',
            $patched,
        );
        $this->assertStringContainsString(
            '<link rel="modulepreload" href="/build/assets/progress.js"',
            $patched,
        );
        $this->assertStringContainsString(
            '<link rel="modulepreload" href="/build/assets/chunk.js"',
            $patched,
        );
    }

    public function testInjectsBeforeExistingHeadContent(): void
    {
        $html = '<head><title>x</title></head><body><ui-input/></body>';
        $event = $this->makeResponseEvent($html);
        $this->createSubscriber()->onKernelResponse($event);

        $patched = (string) $event->getResponse()->getContent();
        // Preload link must come before <title> because it's injected right
        // after the opening <head> tag.
        $titlePos = strpos($patched, '<title>');
        $preloadPos = strpos($patched, 'modulepreload');
        $this->assertNotFalse($titlePos);
        $this->assertNotFalse($preloadPos);
        $this->assertLessThan($titlePos, $preloadPos);
    }

    public function testEmitsHttpLinkHeaderForEarlyHints(): void
    {
        $html = '<head></head><body><ui-input/></body>';
        $event = $this->makeResponseEvent($html);
        $this->createSubscriber()->onKernelResponse($event);

        // Symfony stores each `Link:` value as a separate header for `103
        // Early Hints` / `Server-Timing` style usage.
        $headers = $event->getResponse()->headers->all('link');
        $this->assertContains('</build/assets/input.js>; rel=modulepreload', $headers);
        $this->assertContains('</build/assets/chunk.js>; rel=modulepreload', $headers);
    }

    public function testSkipsNonHtmlResponses(): void
    {
        $event = $this->makeResponseEvent('{"foo":"bar"}', 'application/json');
        $this->createSubscriber()->onKernelResponse($event);

        $this->assertNull($event->getResponse()->headers->get('Link'));
        $this->assertSame('{"foo":"bar"}', $event->getResponse()->getContent());
    }

    public function testSkipsSubrequests(): void
    {
        $event = $this->makeResponseEvent('<head></head><body><ui-input/></body>', requestType: HttpKernelInterface::SUB_REQUEST);
        $this->createSubscriber()->onKernelResponse($event);

        $this->assertNull($event->getResponse()->headers->get('Link'));
        $this->assertStringNotContainsString('modulepreload', (string) $event->getResponse()->getContent());
    }

    public function testIsANoopWhenNoCustomElementsArePresent(): void
    {
        $html = '<head></head><body><div>plain html</div></body>';
        $event = $this->makeResponseEvent($html);
        $this->createSubscriber()->onKernelResponse($event);

        $this->assertNull($event->getResponse()->headers->get('Link'));
        $this->assertSame($html, $event->getResponse()->getContent());
    }

    public function testSubscriberAdvertisesItsKernelEvent(): void
    {
        $events = ReactolithPreloadSubscriber::getSubscribedEvents();
        $this->assertArrayHasKey('kernel.response', $events);
    }

    private function makeResponseEvent(
        string $content,
        string $contentType = 'text/html; charset=UTF-8',
        int $requestType = HttpKernelInterface::MAIN_REQUEST,
    ): ResponseEvent {
        $response = new Response($content);
        $response->headers->set('Content-Type', $contentType);

        return new ResponseEvent(
            $this->createMock(HttpKernelInterface::class),
            Request::create('/apply'),
            $requestType,
            $response,
        );
    }

    private function createSubscriber(): ReactolithPreloadSubscriber
    {
        $resolver = new VitePreloadLinkResolver(
            $this->manifestPath,
            [
                ['prefix' => 'ui-', 'path' => 'assets/components/ui'],
                ['prefix' => 'flow-', 'path' => 'assets/components/flow'],
            ],
        );

        return new ReactolithPreloadSubscriber($resolver);
    }
}

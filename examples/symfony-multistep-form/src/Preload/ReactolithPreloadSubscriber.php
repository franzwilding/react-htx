<?php

declare(strict_types=1);

namespace App\Preload;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Closes the discoverability gap reactolith mentions in its [chunk-preloading
 * docs](https://reactolith.github.io/preloading/): because each `<ui-*>` /
 * `<ui-*>` tag is resolved lazily, the browser only learns which chunks the
 * page needs after parsing the document. This subscriber walks the response
 * HTML once, looks every custom-element name up in the Vite manifest via
 * `VitePreloadLinkResolver`, and injects `<link rel="modulepreload">` /
 * `<link rel="preload" as="style">` tags into `<head>`. It also emits the
 * same hints as HTTP `Link:` headers so an HTTP/2 server can flush them as
 * `103 Early Hints` if it wants to.
 */
final class ReactolithPreloadSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly VitePreloadLinkResolver $resolver,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        // Run late so any earlier listener (security, profiler, …) has already
        // produced the final body we want to scan.
        return [
            KernelEvents::RESPONSE => ['onKernelResponse', -16],
        ];
    }

    public function onKernelResponse(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }
        $response = $event->getResponse();
        if (!str_contains((string) $response->headers->get('Content-Type', ''), 'text/html')) {
            return;
        }
        $content = $response->getContent();
        if (!is_string($content) || $content === '') {
            return;
        }

        $tags = $this->extractCustomElementTags($content);
        if ($tags === []) {
            return;
        }

        $links = $this->resolver->linksFor($tags);
        if ($links === []) {
            return;
        }

        // HTTP `Link:` header — comma-separated, multiple values OK per RFC 8288.
        $existing = (array) $response->headers->all('link');
        $headerValues = array_map(static fn (PreloadLink $l): string => $l->toHeader(), $links);
        $response->headers->set('Link', array_merge($existing, $headerValues), false);

        // Also inject `<link>` tags right after `<head>` so they're picked up
        // by browsers that don't see the HTTP/2 hint (and so the test suite
        // can assert on rendered HTML).
        $tagsHtml = implode('', array_map(static fn (PreloadLink $l): string => $l->toTag(), $links));
        $patched = preg_replace(
            '/<head([^>]*)>/i',
            '<head$1>'.$tagsHtml,
            $content,
            1,
        );
        if (is_string($patched) && $patched !== $content) {
            $response->setContent($patched);
        }
    }

    /**
     * Return a deduplicated list of every kebab-case custom-element name
     * found in `$html`. Matches both empty and content-bearing tags.
     *
     * @return list<string>
     */
    public function extractCustomElementTags(string $html): array
    {
        if (!preg_match_all('/<([a-z][a-z0-9]*-[a-z0-9-]*)\b/i', $html, $matches)) {
            return [];
        }
        $seen = [];
        foreach ($matches[1] as $tag) {
            $tag = strtolower($tag);
            $seen[$tag] = true;
        }

        return array_keys($seen);
    }
}

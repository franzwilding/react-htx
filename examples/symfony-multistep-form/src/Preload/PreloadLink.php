<?php

declare(strict_types=1);

namespace App\Preload;

/**
 * A single preload directive resolved from the Vite manifest. Rendered both
 * as an HTTP `Link:` header value and as a `<link>` tag in `<head>`.
 */
final readonly class PreloadLink
{
    /**
     * @param 'modulepreload'|'preload' $rel
     * @param string|null               $as `style`, `font`, `image`, … (only meaningful for rel="preload")
     */
    public function __construct(
        public string $url,
        public string $rel,
        public ?string $as = null,
    ) {
    }

    /**
     * Render as an HTTP `Link` header value:
     *   </build/assets/input-XYZ.js>; rel=modulepreload
     */
    public function toHeader(): string
    {
        $parts = ['<'.$this->url.'>', 'rel='.$this->rel];
        if ($this->as !== null) {
            $parts[] = 'as='.$this->as;
        }

        return implode('; ', $parts);
    }

    /**
     * Render as an HTML `<link>` tag for injection into `<head>`.
     */
    public function toTag(): string
    {
        $attrs = [
            'rel' => $this->rel,
            'href' => $this->url,
        ];
        if ($this->as !== null) {
            $attrs['as'] = $this->as;
        }
        if ($this->rel === 'modulepreload' || ($this->rel === 'preload' && $this->as === 'style')) {
            $attrs['crossorigin'] = 'anonymous';
        }
        $html = '<link';
        foreach ($attrs as $name => $value) {
            $html .= ' '.$name.'="'.htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'"';
        }

        return $html.'>';
    }
}

<?php

declare(strict_types=1);

namespace App\Tests\FormTheme;

use App\Twig\ReactolithFormExtension;
use Symfony\Bridge\Twig\Extension\FormExtension;
use Symfony\Bridge\Twig\Extension\TranslationExtension;
use Symfony\Bridge\Twig\Test\FormLayoutTestCase;
use Symfony\Component\Form\Extension\Validator\ValidatorExtension as FormValidatorExtension;
use Symfony\Component\Translation\Translator;
use Symfony\Component\Validator\Validation;

/**
 * Base test case for asserting that the reactolith form theme emits the
 * right kebab-case custom tags (`<my-form>`, `<ui-input>`, `<ui-field>`, …).
 *
 * Tests use plain string assertions on the rendered HTML rather than xpath
 * because the output is intentionally not XHTML-compliant (custom tag
 * names with hyphens, mixed `json-*` attributes) — reactolith parses it on
 * the client, and that's the only consumer that matters.
 */
abstract class ShadcnFormThemeTestCase extends FormLayoutTestCase
{
    protected function getExtensions(): array
    {
        return [
            new FormValidatorExtension(Validation::createValidator()),
        ];
    }

    protected function getTemplatePaths(): array
    {
        return [
            __DIR__.'/../../templates',
            __DIR__.'/../../vendor/symfony/twig-bridge/Resources/views/Form',
        ];
    }

    protected function getTwigExtensions(): array
    {
        return [
            new TranslationExtension(new Translator('en')),
            new FormExtension(),
            new ReactolithFormExtension(),
        ];
    }

    protected function getThemes(): array
    {
        return [
            'form_div_layout.html.twig',
            'form/shadcn_form_theme.html.twig',
        ];
    }

    /**
     * Convenience matcher: assert that the rendered HTML contains exactly
     * one occurrence of a kebab-case tag with the given name. We deliberately
     * count `<tag` (no trailing `>`) so attributes don't matter.
     */
    protected function assertContainsTag(string $html, string $tag, ?int $times = null): void
    {
        $count = substr_count($html, '<'.$tag);
        if ($times === null) {
            $this->assertGreaterThan(
                0,
                $count,
                \sprintf("Expected at least one `<%s>` tag in:\n%s", $tag, $html),
            );

            return;
        }
        $this->assertSame(
            $times,
            $count,
            \sprintf("Expected exactly %d `<%s>` tags but found %d in:\n%s", $times, $tag, $count, $html),
        );
    }

    protected function assertNotContainsTag(string $html, string $tag): void
    {
        $this->assertSame(
            0,
            substr_count($html, '<'.$tag),
            \sprintf("Expected no `<%s>` tag in:\n%s", $tag, $html),
        );
    }
}

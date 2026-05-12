<?php

declare(strict_types=1);

namespace App\Tests\FormTheme;

use Symfony\Bridge\Twig\Extension\FormExtension;
use Symfony\Bridge\Twig\Extension\TranslationExtension;
use Symfony\Bridge\Twig\Test\FormLayoutTestCase;
use Symfony\Component\Form\Extension\Validator\ValidatorExtension as FormValidatorExtension;
use Symfony\Component\Translation\Translator;
use Symfony\Component\Validator\Validation;

/**
 * Base test case for asserting that the shadcn form theme produces the
 * expected HTML for every Symfony form widget.
 *
 * Subclasses simply build a FormType, call $this->renderRow($view) (or
 * renderWidget / renderLabel / renderHelp / renderErrors), and assert on the
 * resulting markup. The base class wires up:
 *
 *  - a Symfony FormFactory with the Validator extension enabled
 *  - a Twig environment with TwigBridge's FormExtension and TranslationExtension
 *  - the shadcn form theme registered as the default form_theme
 *  - the original form_div_layout.html.twig template path so any block we don't
 *    override is inherited from Symfony's defaults.
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
        ];
    }

    protected function getThemes(): array
    {
        return [
            'form_div_layout.html.twig',
            'form/shadcn_form_theme.html.twig',
        ];
    }
}

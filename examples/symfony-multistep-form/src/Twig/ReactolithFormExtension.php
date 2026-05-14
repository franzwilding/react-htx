<?php

declare(strict_types=1);

namespace App\Twig;

use Symfony\Component\Form\FormInterface;
use Symfony\Component\Form\FormView;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/**
 * Exposes Symfony form state in the exact shape reactolith's `<Form>`
 * expects on the client:
 *
 *  - `reactolith_form_errors(FormView)`     → list of {name, id, message}
 *     destined for the `json-errors` attribute on `<my-form>`.
 *  - `reactolith_progress_steps(FormView)`  → list of {name, label, position,
 *     isCurrent} for `<ui-progress>`.
 *
 * Both helpers are pure (no side effects on the form), so they're safe to
 * call as many times as the template wants.
 */
final class ReactolithFormExtension extends AbstractExtension
{
    public function getFunctions(): array
    {
        return [
            new TwigFunction('reactolith_form_errors', $this->errorsFor(...)),
            new TwigFunction('reactolith_progress_steps', $this->progressStepsFor(...)),
        ];
    }

    /**
     * @return list<array{name: string, id: string, message: string}>
     */
    public function errorsFor(FormView|FormInterface $form): array
    {
        $view = $form instanceof FormInterface ? $form->createView() : $form;
        $out = [];
        $this->walk($view, $out);

        return $out;
    }

    /**
     * @return list<array{name: string, label: string, position: int, isCurrent: bool}>
     */
    public function progressStepsFor(FormView $form): array
    {
        $steps = $form->vars['visible_steps'] ?? null;
        if (!is_array($steps)) {
            return [];
        }
        $out = [];
        foreach ($steps as $name => $step) {
            $out[] = [
                'name' => (string) $name,
                'label' => ucfirst(str_replace('_', ' ', (string) $name)),
                'position' => (int) ($step['position'] ?? 0),
                'isCurrent' => (bool) ($step['is_current_step'] ?? false),
            ];
        }

        return $out;
    }

    /**
     * Walk a FormView tree, collecting every error at a leaf path. Errors on
     * compound forms bubble up as the field they belong to so the client can
     * pair them with the right `<ui-field>` via `name`.
     *
     * @param list<array{name: string, id: string, message: string}> $out
     */
    private function walk(FormView $view, array &$out): void
    {
        foreach ($view->vars['errors'] ?? [] as $error) {
            $message = method_exists($error, 'getMessage')
                ? (string) $error->getMessage()
                : (string) $error;
            $out[] = [
                'name' => (string) ($view->vars['full_name'] ?? ''),
                'id' => (string) ($view->vars['id'] ?? ''),
                'message' => $message,
            ];
        }
        foreach ($view->children as $child) {
            $this->walk($child, $out);
        }
    }
}

<?php

declare(strict_types=1);

namespace App\Tests\FormTheme;

use App\Form\Flow\ApplicationFlowType;
use App\Model\Application;
use App\Twig\ReactolithFormExtension;
use Symfony\Bridge\Twig\Extension\FormExtension;
use Symfony\Bridge\Twig\Extension\TranslationExtension;
use Symfony\Bridge\Twig\Form\TwigRendererEngine;
use Symfony\Bridge\Twig\Test\Traits\RuntimeLoaderProvider;
use Symfony\Component\Form\Extension\Validator\ValidatorExtension as FormValidatorExtension;
use Symfony\Component\Form\Flow\DataStorage\InMemoryDataStorage;
use Symfony\Component\Form\Flow\FormFlowInterface;
use Symfony\Component\Form\FormRenderer;
use Symfony\Component\Form\Test\FormIntegrationTestCase;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Security\Csrf\CsrfTokenManager;
use Symfony\Component\Translation\Translator;
use Symfony\Component\Validator\Validation;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;

/**
 * Renders the full ApplicationFlowType through the reactolith theme and
 * asserts that the FormFlow navigator becomes a `<flow-navigator>` with the
 * right buttons forwarded as `<ui-button data-action="…">`.
 */
class ShadcnFlowNavigatorTest extends FormIntegrationTestCase
{
    use RuntimeLoaderProvider;

    private FormRenderer $renderer;

    protected function getExtensions(): array
    {
        return [
            new FormValidatorExtension(Validation::createValidator()),
        ];
    }

    protected function getTypes(): array
    {
        return [
            new ApplicationFlowType(new RequestStack()),
        ];
    }

    protected function setUp(): void
    {
        parent::setUp();

        $loader = new FilesystemLoader([
            __DIR__.'/../../templates',
            __DIR__.'/../../vendor/symfony/twig-bridge/Resources/views/Form',
        ]);

        $env = new Environment($loader, ['strict_variables' => true]);
        $env->addExtension(new TranslationExtension(new Translator('en')));
        $env->addExtension(new FormExtension());
        $env->addExtension(new ReactolithFormExtension());

        $themes = ['form_div_layout.html.twig', 'form/shadcn_form_theme.html.twig'];
        $this->renderer = new FormRenderer(new TwigRendererEngine($themes, $env), new CsrfTokenManager());
        $this->registerTwigRuntimeLoader($env, $this->renderer);
    }

    public function testNavigatorOnFirstStepShowsOnlyContinueButton(): void
    {
        $flow = $this->createFlow();
        $view = $flow->createView();

        $html = $this->renderer->searchAndRenderBlock(
            $view->children['navigator'],
            'widget',
        );

        $this->assertStringContainsString('<flow-navigator', $html);
        $this->assertStringContainsString('data-action="next"', $html);
        $this->assertStringContainsString('>Continue<', $html);
        $this->assertStringNotContainsString('data-action="previous"', $html);
        $this->assertStringNotContainsString('data-action="finish"', $html);
    }

    public function testNavigatorOnLastStepShowsBackAndFinishButtons(): void
    {
        $app = new Application();
        $app->currentStep = Application::STEP_CONFIRM;
        $flow = $this->createFlow($app);

        $html = $this->renderer->searchAndRenderBlock(
            $flow->createView()->children['navigator'],
            'widget',
        );

        $this->assertStringContainsString('<flow-navigator', $html);
        $this->assertStringContainsString('data-action="previous"', $html);
        $this->assertStringContainsString('data-action="finish"', $html);
        $this->assertStringContainsString('variant="outline"', $html);
        $this->assertStringNotContainsString('data-action="next"', $html);
    }

    public function testProgressStepsAreSerialisedAsJsonSteps(): void
    {
        $flow = $this->createFlow();
        $html = $this->renderer->searchAndRenderBlock($flow->createView(), 'widget');

        $this->assertStringContainsString('<flow-progress', $html);
        $this->assertStringContainsString('json-steps=', $html);
        foreach (Application::STEPS as $step) {
            $this->assertStringContainsString(
                '&quot;name&quot;&#x3A;&quot;'.$step.'&quot;',
                $html,
                \sprintf('Expected step "%s" in json-steps payload.', $step),
            );
        }
    }

    public function testWholeFormRendersInsideMyForm(): void
    {
        $flow = $this->createFlow();
        $html = $this->renderer->renderBlock($flow->createView(), 'form');

        $this->assertStringContainsString('<my-form', $html);
        $this->assertStringContainsString('</my-form>', $html);
        $this->assertStringContainsString('<flow-progress', $html);
        $this->assertStringContainsString('<flow-navigator', $html);
        $this->assertStringContainsString('<ui-field', $html);
    }

    private function createFlow(?Application $app = null): FormFlowInterface
    {
        $form = $this->factory->create(ApplicationFlowType::class, $app ?? new Application(), [
            'data_storage' => new InMemoryDataStorage('navigator-test'),
        ]);

        if (!$form instanceof FormFlowInterface) {
            throw new \LogicException('Expected a FormFlowInterface.');
        }

        return $form;
    }
}

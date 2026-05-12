<?php

declare(strict_types=1);

namespace App\Tests\FormTheme;

use App\Form\Flow\ApplicationFlowType;
use App\Model\Application;
use Symfony\Bridge\Twig\Extension\FormExtension;
use Symfony\Bridge\Twig\Extension\TranslationExtension;
use Symfony\Bridge\Twig\Form\TwigRendererEngine;
use Symfony\Bridge\Twig\Test\Traits\RuntimeLoaderProvider;
use Symfony\Component\Form\Extension\Validator\ValidatorExtension as FormValidatorExtension;
use Symfony\Component\Form\Flow\DataStorage\InMemoryDataStorage;
use Symfony\Component\Form\Flow\FormFlowInterface;
use Symfony\Component\Form\FormRenderer;
use Symfony\Component\Form\Forms;
use Symfony\Component\Form\Test\FormIntegrationTestCase;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Security\Csrf\CsrfTokenManager;
use Symfony\Component\Translation\Translator;
use Symfony\Component\Validator\Validation;
use Twig\Environment;
use Twig\Loader\FilesystemLoader;

/**
 * Renders the full ApplicationFlowType through the shadcn theme and verifies
 * that the FormFlow navigator widget is wired up exactly as the navigator
 * block in shadcn_form_theme.html.twig promises.
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

        $themes = ['form_div_layout.html.twig', 'form/shadcn_form_theme.html.twig'];
        $this->renderer = new FormRenderer(new TwigRendererEngine($themes, $env), new CsrfTokenManager());
        $this->registerTwigRuntimeLoader($env, $this->renderer);
    }

    public function testNavigatorOnFirstStepShowsOnlyContinueButton(): void
    {
        $flow = $this->createFlow();
        $view = $flow->createView();

        $html = $this->renderer->searchAndRenderBlock($view->children['navigator'], 'widget');

        $this->assertStringContainsString('shadcn-flow-navigator', $html);
        $this->assertStringContainsString('Continue', $html);
        $this->assertStringNotContainsString('Back', $html);
        $this->assertStringNotContainsString('Submit application', $html);
        $this->assertStringContainsString('bg-primary', $html);
    }

    public function testNavigatorOnLastStepShowsBackAndFinishButtons(): void
    {
        $app = new Application();
        $app->currentStep = Application::STEP_CONFIRM;
        $flow = $this->createFlow($app);
        $view = $flow->createView();

        $html = $this->renderer->searchAndRenderBlock($view->children['navigator'], 'widget');

        $this->assertStringContainsString('Back', $html);
        $this->assertStringContainsString('Submit application', $html);
        $this->assertStringNotContainsString('Continue', $html);
        // Back button uses the outline variant.
        $this->assertStringContainsString('shadcn-previous', $html);
        $this->assertStringContainsString('border-input', $html);
    }

    public function testProgressBarRendersOneStepPerVisibleStep(): void
    {
        $flow = $this->createFlow();
        $view = $flow->createView();

        $html = $this->renderer->searchAndRenderBlock($view, 'widget');

        $this->assertStringContainsString('shadcn-flow-progress', $html);
        $this->assertStringContainsString('aria-label="Form progress"', $html);
        // 6 steps × one progress item each.
        $this->assertSame(6, substr_count($html, '<li class="flex flex-col items-start gap-1">'));
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

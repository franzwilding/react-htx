<?php

declare(strict_types=1);

namespace App\Form\Flow;

use App\Form\Step\AddressStepType;
use App\Form\Step\ConfirmStepType;
use App\Form\Step\DocumentsStepType;
use App\Form\Step\EmploymentStepType;
use App\Form\Step\PersonalStepType;
use App\Form\Step\PreferencesStepType;
use App\Model\Application;
use Symfony\Component\Form\Flow\AbstractFlowType;
use Symfony\Component\Form\Flow\DataStorage\SessionDataStorage;
use Symfony\Component\Form\Flow\FormFlowBuilderInterface;
use Symfony\Component\Form\Flow\Type\NavigatorFlowType;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * The full multi-step application flow.
 *
 * This class wires every step together into a single Symfony FormFlow.
 * The flow is bound to the App\Model\Application aggregate; the current
 * step is persisted on the `currentStep` property and the form data is
 * persisted to the session between requests.
 */
class ApplicationFlowType extends AbstractFlowType
{
    public function __construct(
        private readonly RequestStack $requestStack,
    ) {
    }

    public function buildFormFlow(FormFlowBuilderInterface $builder, array $options): void
    {
        $builder
            ->addStep(Application::STEP_PERSONAL, PersonalStepType::class)
            ->addStep(Application::STEP_ADDRESS, AddressStepType::class)
            ->addStep(Application::STEP_EMPLOYMENT, EmploymentStepType::class)
            ->addStep(Application::STEP_PREFERENCES, PreferencesStepType::class)
            ->addStep(Application::STEP_DOCUMENTS, DocumentsStepType::class)
            ->addStep(Application::STEP_CONFIRM, ConfirmStepType::class)
            ->add('navigator', NavigatorFlowType::class);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Application::class,
            'step_property_path' => 'currentStep',
            'data_storage' => new SessionDataStorage('app.application_flow', $this->requestStack),
        ]);
    }
}

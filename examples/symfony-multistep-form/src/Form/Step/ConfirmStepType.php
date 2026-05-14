<?php

declare(strict_types=1);

namespace App\Form\Step;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\IsTrue;

/**
 * Step 6 — Review & confirm.
 *
 * The step doesn't bind to a property of the Application aggregate — it just
 * exposes a final "I confirm everything is correct" checkbox before the
 * FinishFlowType button completes the flow.
 */
class ConfirmStepType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        // NOTE: we deliberately name the field "accepted" rather than "confirm"
        // to avoid colliding with the step name itself — the FormFlow component
        // routes submission arrays by step name, and a child field of the same
        // name would shadow the step in `isCurrentStepSubmitted()`.
        $builder
            ->add('accepted', CheckboxType::class, [
                'label' => 'I confirm that the information above is accurate.',
                'mapped' => false,
                'required' => false,
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        // inherit_data => true makes this step "transparent": it does not bind
        // to its own data class but reads/writes through to the parent
        // Application aggregate. That's exactly what a review step needs since
        // the single non-mapped `confirm` checkbox is informational only and
        // doesn't belong on the Application model.
        $resolver->setDefaults([
            'inherit_data' => true,
        ]);
    }
}

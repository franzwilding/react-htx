<?php

declare(strict_types=1);

namespace App\Form\Step;

use App\Model\Employment;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\CurrencyType;
use Symfony\Component\Form\Extension\Core\Type\DateIntervalType;
use Symfony\Component\Form\Extension\Core\Type\DateTimeType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\MoneyType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\PercentType;
use Symfony\Component\Form\Extension\Core\Type\RangeType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\TimeType;
use Symfony\Component\Form\Extension\Core\Type\WeekType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * Step 3 — Employment & numerical inputs.
 *
 * Covers: TextType, ChoiceType (select), MoneyType, CurrencyType, PercentType,
 * IntegerType, NumberType, RangeType, DateType, TimeType, DateTimeType,
 * DateIntervalType, WeekType.
 */
class EmploymentStepType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('company', TextType::class, [
                'label' => 'Current employer',
                'required' => false,
                'attr' => ['placeholder' => 'Acme Inc.'],
            ])
            ->add('status', ChoiceType::class, [
                'label' => 'Employment status',
                'required' => false,
                'choices' => [
                    'Employed' => 'employed',
                    'Self-employed' => 'self_employed',
                    'Student' => 'student',
                    'Between jobs' => 'between_jobs',
                    'Retired' => 'retired',
                ],
                'placeholder' => '— select your status —',
            ])
            ->add('annualSalary', MoneyType::class, [
                'label' => 'Annual gross salary',
                'required' => false,
                'currency' => 'EUR',
                'divisor' => 1,
                'help' => 'Used to calculate plan eligibility.',
            ])
            ->add('salaryCurrency', CurrencyType::class, [
                'label' => 'Salary currency',
                'required' => false,
                'placeholder' => '— select currency —',
            ])
            ->add('taxRate', PercentType::class, [
                'label' => 'Effective tax rate',
                'required' => false,
                'type' => 'fractional',
                'scale' => 2,
                'help' => 'Enter a percentage, e.g. 32.5%.',
            ])
            ->add('yearsOfExperience', IntegerType::class, [
                'label' => 'Years of experience',
                'required' => false,
                'attr' => ['min' => 0, 'max' => 60],
            ])
            ->add('weeklyHours', RangeType::class, [
                'label' => 'Weekly working hours',
                'required' => false,
                'attr' => ['min' => 0, 'max' => 80, 'step' => 1],
                'help' => 'Drag the slider to your average weekly hours.',
            ])
            ->add('startDate', DateType::class, [
                'label' => 'Start date',
                'required' => false,
                'widget' => 'single_text',
                'input' => 'datetime_immutable',
                'help' => 'When did you join your current employer?',
            ])
            ->add('preferredMeetingTime', TimeType::class, [
                'label' => 'Preferred meeting time',
                'widget' => 'single_text',
                'input' => 'datetime_immutable',
                'required' => false,
            ])
            ->add('lastPromotionAt', DateTimeType::class, [
                'label' => 'Last promotion',
                'widget' => 'single_text',
                'input' => 'datetime_immutable',
                'required' => false,
                'help' => 'Date and time of your most recent promotion.',
            ])
            ->add('noticePeriod', DateIntervalType::class, [
                'label' => 'Notice period',
                'widget' => 'integer',
                'with_years' => false,
                'with_months' => true,
                'with_weeks' => false,
                'with_days' => true,
                'with_hours' => false,
                'with_minutes' => false,
                'with_seconds' => false,
                'input' => 'dateinterval',
                'required' => false,
            ])
            ->add('vacationWeek', WeekType::class, [
                'label' => 'Preferred vacation week',
                'widget' => 'single_text',
                'input' => 'string',
                'required' => false,
                'help' => 'Pick an ISO week number for your summer vacation.',
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Employment::class,
            'inherit_data' => false,
        ]);
    }
}

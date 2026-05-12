<?php

declare(strict_types=1);

namespace App\Form\Step;

use App\Model\Personal;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\BirthdayType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\TelType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\UrlType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * Step 1 — Personal information.
 *
 * Covers: TextType, EmailType, TelType, BirthdayType, ChoiceType (expanded radios),
 * UrlType.
 */
class PersonalStepType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('firstName', TextType::class, [
                'label' => 'First name',
                'help' => 'How should we address you in emails?',
                'attr' => ['autocomplete' => 'given-name', 'placeholder' => 'Ada'],
            ])
            ->add('lastName', TextType::class, [
                'label' => 'Last name',
                'attr' => ['autocomplete' => 'family-name', 'placeholder' => 'Lovelace'],
            ])
            ->add('email', EmailType::class, [
                'label' => 'Email address',
                'help' => 'We will never share this with anyone.',
                'attr' => ['autocomplete' => 'email', 'placeholder' => 'ada@example.com'],
            ])
            ->add('phone', TelType::class, [
                'label' => 'Phone number',
                'attr' => ['autocomplete' => 'tel', 'placeholder' => '+44 20 7946 0958'],
            ])
            ->add('dateOfBirth', BirthdayType::class, [
                'label' => 'Date of birth',
                'help' => 'You must be at least 18 years old.',
                'widget' => 'single_text',
                'input' => 'datetime_immutable',
            ])
            ->add('gender', ChoiceType::class, [
                'label' => 'Gender',
                'choices' => [
                    'Female' => 'female',
                    'Male' => 'male',
                    'Non-binary' => 'non_binary',
                    'Prefer not to say' => 'prefer_not',
                ],
                'expanded' => true,
                'multiple' => false,
                'placeholder' => false,
            ])
            ->add('website', UrlType::class, [
                'label' => 'Personal website',
                'required' => false,
                'default_protocol' => 'https',
                'help' => 'Optional — link to your blog, GitHub or portfolio.',
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Personal::class,
            'inherit_data' => false,
        ]);
    }
}

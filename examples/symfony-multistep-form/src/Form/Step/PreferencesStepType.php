<?php

declare(strict_types=1);

namespace App\Form\Step;

use App\Model\MembershipTier;
use App\Model\Preferences;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\ColorType;
use Symfony\Component\Form\Extension\Core\Type\EnumType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\SearchType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * Step 4 — Preferences & account credentials.
 *
 * Covers: ChoiceType (multi-checkbox, expanded radios), CheckboxType, ColorType,
 * SearchType, PasswordType, RepeatedType, TextareaType, EnumType, HiddenType.
 */
class PreferencesStepType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('interests', ChoiceType::class, [
                'label' => 'Interests',
                'choices' => [
                    'Frontend engineering' => 'frontend',
                    'Backend engineering' => 'backend',
                    'DevOps & infrastructure' => 'devops',
                    'Product design' => 'design',
                    'Data & ML' => 'data',
                    'Open source' => 'oss',
                ],
                'expanded' => true,
                'multiple' => true,
                'help' => 'Pick at least one — we use this to tailor your dashboard.',
            ])
            ->add('newsletterFrequency', ChoiceType::class, [
                'label' => 'Newsletter frequency',
                'choices' => [
                    'Daily digest' => 'daily',
                    'Weekly roundup' => 'weekly',
                    'Monthly recap' => 'monthly',
                    'Never email me' => 'never',
                ],
                'expanded' => true,
                'multiple' => false,
                'placeholder' => false,
            ])
            ->add('acceptsTerms', CheckboxType::class, [
                'label' => 'I accept the Terms of Service and Privacy Policy.',
                'required' => true,
            ])
            ->add('subscribesToTips', CheckboxType::class, [
                'label' => 'Send me product tips and feature announcements.',
                'required' => false,
                'help' => 'You can unsubscribe at any time.',
            ])
            ->add('favoriteColor', ColorType::class, [
                'label' => 'Favorite color',
                'help' => 'Used as the accent color on your profile page.',
            ])
            ->add('searchQuery', SearchType::class, [
                'label' => 'Anything you want us to find for you?',
                'required' => false,
                'attr' => ['placeholder' => 'try "newsletter examples"'],
            ])
            ->add('password', RepeatedType::class, [
                'type' => PasswordType::class,
                'invalid_message' => 'The password fields must match.',
                'first_options' => [
                    'label' => 'Password',
                    'help' => '8 characters minimum.',
                ],
                'second_options' => [
                    'label' => 'Confirm password',
                ],
                'options' => [
                    'attr' => ['autocomplete' => 'new-password'],
                ],
            ])
            ->add('bio', TextareaType::class, [
                'label' => 'Short bio',
                'required' => false,
                'attr' => ['rows' => 4, 'placeholder' => 'Tell us a bit about yourself…'],
                'help' => 'Markdown is supported. Max 1000 characters.',
            ])
            ->add('membership', EnumType::class, [
                'label' => 'Membership tier',
                'class' => MembershipTier::class,
                'expanded' => true,
                'multiple' => false,
                'placeholder' => false,
                'choice_label' => static fn (MembershipTier $tier): string => $tier->label(),
            ])
            ->add('referralCode', HiddenType::class, [
                'required' => false,
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Preferences::class,
            'inherit_data' => false,
        ]);
    }
}

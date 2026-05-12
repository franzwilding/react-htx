<?php

declare(strict_types=1);

namespace App\Form\Step;

use App\Model\Address;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CountryType;
use Symfony\Component\Form\Extension\Core\Type\LanguageType;
use Symfony\Component\Form\Extension\Core\Type\LocaleType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\TimezoneType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * Step 2 — Address & locale.
 *
 * Covers: TextType, CountryType, LanguageType, LocaleType, TimezoneType.
 */
class AddressStepType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('street', TextType::class, [
                'label' => 'Street address',
                'attr' => ['autocomplete' => 'street-address', 'placeholder' => '221B Baker Street'],
            ])
            ->add('city', TextType::class, [
                'label' => 'City',
                'attr' => ['autocomplete' => 'address-level2', 'placeholder' => 'London'],
            ])
            ->add('postalCode', TextType::class, [
                'label' => 'Postal / ZIP code',
                'attr' => ['autocomplete' => 'postal-code', 'placeholder' => 'NW1 6XE'],
            ])
            ->add('country', CountryType::class, [
                'label' => 'Country',
                'placeholder' => '— select a country —',
                'attr' => ['autocomplete' => 'country'],
            ])
            ->add('preferredLanguage', LanguageType::class, [
                'label' => 'Preferred language',
                'placeholder' => '— select a language —',
                'help' => 'Used for email notifications.',
            ])
            ->add('locale', LocaleType::class, [
                'label' => 'Locale',
                'placeholder' => '— select a locale —',
                'help' => 'Drives number, date and currency formatting.',
            ])
            ->add('timezone', TimezoneType::class, [
                'label' => 'Timezone',
                'placeholder' => '— select a timezone —',
                'help' => 'All scheduled events are shown in this timezone.',
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Address::class,
            'inherit_data' => false,
        ]);
    }
}

<?php

declare(strict_types=1);

namespace App\Tests\FormTheme;

use App\Form\SkillType;
use App\Model\MembershipTier;
use App\Model\Skill;
use Symfony\Component\Form\Extension\Core\Type\BirthdayType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\CollectionType;
use Symfony\Component\Form\Extension\Core\Type\ColorType;
use Symfony\Component\Form\Extension\Core\Type\CountryType;
use Symfony\Component\Form\Extension\Core\Type\CurrencyType;
use Symfony\Component\Form\Extension\Core\Type\DateIntervalType;
use Symfony\Component\Form\Extension\Core\Type\DateTimeType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\EnumType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\LanguageType;
use Symfony\Component\Form\Extension\Core\Type\LocaleType;
use Symfony\Component\Form\Extension\Core\Type\MoneyType;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\PercentType;
use Symfony\Component\Form\Extension\Core\Type\RangeType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\ResetType;
use Symfony\Component\Form\Extension\Core\Type\SearchType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TelType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\TimeType;
use Symfony\Component\Form\Extension\Core\Type\TimezoneType;
use Symfony\Component\Form\Extension\Core\Type\UlidType;
use Symfony\Component\Form\Extension\Core\Type\UrlType;
use Symfony\Component\Form\Extension\Core\Type\UuidType;
use Symfony\Component\Form\Extension\Core\Type\WeekType;
use Symfony\Component\Form\FormError;

/**
 * Exhaustive widget tests for the shadcn form theme.
 *
 * One test per native Symfony form type. Every test focuses on the class
 * strings and structural HTML that shadcn/ui uses for that exact widget.
 */
class ShadcnFormThemeTest extends ShadcnFormThemeTestCase
{
    public function testFormRowProducesShadcnFormItemStructure(): void
    {
        $form = $this->factory->createNamed('first_name', TextType::class, null, [
            'label' => 'First name',
            'help' => 'How should we address you?',
        ]);

        $html = $this->renderRow($form->createView());

        $this->assertMatchesXpath($html, '//div[contains(@class, "space-y-2") and contains(@class, "shadcn-form-item")]');
        $this->assertMatchesXpath($html, '//div/label[contains(@class, "text-sm") and contains(@class, "font-medium")]');
        $this->assertMatchesXpath($html, '//div/input[@type="text" and contains(@class, "h-9") and contains(@class, "rounded-md")]');
        $this->assertMatchesXpath($html, '//div/p[contains(@class, "text-sm") and contains(@class, "text-muted-foreground") and @id="first_name_help"]');
    }

    public function testRequiredFieldGetsAsteriskAndAriaDescribedby(): void
    {
        $form = $this->factory->createNamed('email', EmailType::class, null, [
            'label' => 'Email',
            'help' => 'We never share this.',
            'required' => true,
        ]);

        $html = $this->renderRow($form->createView());

        $this->assertMatchesXpath($html, '//label[contains(@class, "shadcn-required")]/span[@aria-hidden="true" and text()="*"]');
        $this->assertMatchesXpath($html, '//input[@type="email" and contains(@aria-describedby, "email_help")]');
    }

    public function testFieldWithErrorsGetsAriaInvalidAndShadcnMessage(): void
    {
        $form = $this->factory->createNamed('username', TextType::class, null, [
            'label' => 'Username',
        ]);
        $form->submit('a');
        $form->addError(new FormError('This value is too short.'));

        $html = $this->renderRow($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="text" and @aria-invalid="true"]');
        $this->assertMatchesXpath($html, '//p[contains(@class, "text-destructive") and contains(@class, "shadcn-form-message")]');
    }

    public function testTextWidget(): void
    {
        $form = $this->factory->createNamed('name', TextType::class, 'Ada');
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="text" and @value="Ada" and contains(@class, "h-9") and contains(@class, "border-input") and contains(@class, "rounded-md")]');
    }

    public function testEmailWidget(): void
    {
        $form = $this->factory->createNamed('email', EmailType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="email" and contains(@class, "h-9")]');
    }

    public function testSearchWidget(): void
    {
        $form = $this->factory->createNamed('q', SearchType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="search" and contains(@class, "h-9")]');
    }

    public function testTelWidget(): void
    {
        $form = $this->factory->createNamed('phone', TelType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="tel" and contains(@class, "h-9")]');
    }

    public function testUrlWidget(): void
    {
        $form = $this->factory->createNamed('site', UrlType::class);
        $html = $this->renderWidget($form->createView());

        // Symfony 7.4 renders URL inputs as <input type="text" inputmode="url">.
        $this->assertMatchesXpath($html, '//input[(@type="url" or @type="text") and contains(@class, "h-9")]');
    }

    public function testPasswordWidget(): void
    {
        $form = $this->factory->createNamed('pwd', PasswordType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="password" and contains(@class, "h-9")]');
    }

    public function testIntegerWidget(): void
    {
        $form = $this->factory->createNamed('age', IntegerType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="number" and contains(@class, "h-9")]');
    }

    public function testNumberWidget(): void
    {
        $form = $this->factory->createNamed('amount', NumberType::class);
        $html = $this->renderWidget($form->createView());

        // NumberType deliberately uses type=text to support localized formats.
        $this->assertMatchesXpath($html, '//input[@type="text" and contains(@class, "h-9")]');
    }

    public function testMoneyWidgetWrapsInputWithCurrencyAddon(): void
    {
        $form = $this->factory->createNamed('salary', MoneyType::class, null, ['currency' => 'EUR']);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//div[contains(@class, "relative")]/input[contains(@class, "h-9") and contains(@class, "pl-7")]');
        $this->assertMatchesXpath($html, '//div/span[contains(@class, "absolute") and contains(@class, "text-muted-foreground")]');
    }

    public function testPercentWidgetShowsTrailingPercentSign(): void
    {
        $form = $this->factory->createNamed('rate', PercentType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//div[contains(@class, "relative")]/input[contains(@class, "pr-8")]');
        $this->assertMatchesXpath($html, '//div/span[contains(@class, "right-3") and (text()="%" or contains(., "%"))]');
    }

    public function testRangeWidgetUsesShadcnRangeClasses(): void
    {
        $form = $this->factory->createNamed('hours', RangeType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="range" and contains(@class, "accent-primary") and contains(@class, "cursor-pointer")]');
    }

    public function testColorWidgetUsesShadcnColorClasses(): void
    {
        $form = $this->factory->createNamed('color', ColorType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="color" and contains(@class, "w-16") and contains(@class, "h-9")]');
    }

    public function testHiddenWidgetHasNoExtraClasses(): void
    {
        $form = $this->factory->createNamed('token', HiddenType::class, 'abc');
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="hidden" and @value="abc"]');
        // Ensure no shadcn input class string leaked onto the hidden input.
        $this->assertStringNotContainsString('h-9', $html);
    }

    public function testTextareaWidget(): void
    {
        $form = $this->factory->createNamed('bio', TextareaType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//textarea[contains(@class, "min-h-[80px]") and contains(@class, "rounded-md") and contains(@class, "border-input")]');
    }

    public function testCollapsedChoiceWidget(): void
    {
        $form = $this->factory->createNamed('country', ChoiceType::class, null, [
            'choices' => ['Germany' => 'de', 'France' => 'fr'],
            'placeholder' => 'Pick one',
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//select[contains(@class, "h-9") and contains(@class, "rounded-md") and contains(@class, "border-input")]');
        $this->assertMatchesXpath($html, '//select/option[@value=""]');
        $this->assertMatchesXpath($html, '//select/option[@value="de" and text()="Germany"]');
    }

    public function testExpandedRadioChoiceWidgetUsesCardLayout(): void
    {
        $form = $this->factory->createNamed('plan', ChoiceType::class, null, [
            'choices' => ['Free' => 'free', 'Pro' => 'pro'],
            'expanded' => true,
            'multiple' => false,
            'placeholder' => false,
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//div[contains(@class, "shadcn-choice-group") and @role="radiogroup"]');
        $this->assertMatchesXpath($html, '//div//input[@type="radio" and contains(@class, "rounded-full") and contains(@class, "accent-primary")]', 2);
        $this->assertMatchesXpath($html, '//div//label[contains(@class, "cursor-pointer") and contains(@class, "has-[:checked]:border-primary")]', 2);
        $this->assertMatchesXpath($html, '//div//div[contains(@class, "leading-none")]', 2);
    }

    public function testExpandedMultipleChoiceWidgetUsesCheckboxes(): void
    {
        $form = $this->factory->createNamed('interests', ChoiceType::class, null, [
            'choices' => ['Frontend' => 'fe', 'Backend' => 'be'],
            'expanded' => true,
            'multiple' => true,
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//div[contains(@class, "shadcn-choice-group") and @role="group"]');
        $this->assertMatchesXpath($html, '//div//input[@type="checkbox" and contains(@class, "rounded-sm") and contains(@class, "accent-primary")]', 2);
    }

    public function testStandaloneCheckboxRowUsesCardLayout(): void
    {
        $form = $this->factory->createNamed('terms', CheckboxType::class, null, [
            'label' => 'I accept the terms',
            'help' => 'Required to continue.',
        ]);
        $html = $this->renderRow($form->createView());

        $this->assertMatchesXpath($html, '//div[contains(@class, "shadcn-form-item")]/div[contains(@class, "rounded-md") and contains(@class, "border-input")]/input[@type="checkbox"]');
        $this->assertMatchesXpath($html, '//div/div/div[contains(@class, "leading-none")]/label[contains(@class, "cursor-pointer")]');
        $this->assertMatchesXpath($html, '//div/div/div/p[contains(@class, "text-muted-foreground")]');
    }

    public function testFileWidgetUsesShadcnFileButtonStyles(): void
    {
        $form = $this->factory->createNamed('resume', FileType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="file" and contains(@class, "file:bg-secondary") and contains(@class, "file:rounded-md")]');
    }

    public function testDateWidgetSingleText(): void
    {
        $form = $this->factory->createNamed('dob', DateType::class, null, [
            'widget' => 'single_text',
            'input' => 'datetime_immutable',
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="date" and contains(@class, "h-9")]');
    }

    public function testDateWidgetChoiceVariantUsesSelectClass(): void
    {
        $form = $this->factory->createNamed('dob', DateType::class, null, [
            'widget' => 'choice',
            'input' => 'datetime_immutable',
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//div[contains(@class, "flex-wrap")]/select[contains(@class, "h-9") and contains(@class, "rounded-md")]', 3);
    }

    public function testBirthdayWidget(): void
    {
        $form = $this->factory->createNamed('dob', BirthdayType::class, null, [
            'widget' => 'single_text',
            'input' => 'datetime_immutable',
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="date" and contains(@class, "h-9")]');
    }

    public function testTimeWidgetSingleText(): void
    {
        $form = $this->factory->createNamed('t', TimeType::class, null, [
            'widget' => 'single_text',
            'input' => 'datetime_immutable',
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="time" and contains(@class, "h-9")]');
    }

    public function testDateTimeWidgetSingleText(): void
    {
        $form = $this->factory->createNamed('dt', DateTimeType::class, null, [
            'widget' => 'single_text',
            'input' => 'datetime_immutable',
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="datetime-local" and contains(@class, "h-9")]');
    }

    public function testWeekWidgetSingleText(): void
    {
        $form = $this->factory->createNamed('w', WeekType::class, null, [
            'widget' => 'single_text',
            'input' => 'string',
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="week" and contains(@class, "h-9")]');
    }

    public function testDateIntervalWidgetIntegerVariant(): void
    {
        $form = $this->factory->createNamed('notice', DateIntervalType::class, null, [
            'widget' => 'integer',
            'with_years' => false,
            'with_months' => true,
            'with_weeks' => false,
            'with_days' => true,
            'with_hours' => true,
            'with_minutes' => false,
            'with_seconds' => false,
            'input' => 'dateinterval',
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//div[contains(@class, "grid")]/div[contains(@class, "space-y-1")]', 3);
        $this->assertMatchesXpath($html, '//div/div/input[@type="number" and contains(@class, "h-9")]', 3);
    }

    public function testCountryLanguageLocaleTimezoneCurrencyRenderAsSelect(): void
    {
        foreach ([CountryType::class, LanguageType::class, LocaleType::class, TimezoneType::class, CurrencyType::class] as $type) {
            $form = $this->factory->createNamed('country', $type, null, ['placeholder' => 'Pick one']);
            $html = $this->renderWidget($form->createView());

            $this->assertMatchesXpath(
                $html,
                '//select[contains(@class, "h-9") and contains(@class, "rounded-md")]',
                1,
            );
            $this->assertStringContainsString('<option', $html);
        }
    }

    public function testEnumWidget(): void
    {
        $form = $this->factory->createNamed('tier', EnumType::class, null, [
            'class' => MembershipTier::class,
            'placeholder' => 'Pick one',
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//select[contains(@class, "h-9") and contains(@class, "rounded-md")]');
        $this->assertMatchesXpath($html, '//select/option[@value="free"]');
        $this->assertMatchesXpath($html, '//select/option[@value="pro"]');
        $this->assertMatchesXpath($html, '//select/option[@value="enterprise"]');
    }

    public function testRepeatedPasswordRendersTwoFields(): void
    {
        $form = $this->factory->createNamed('pwd', RepeatedType::class, null, ['type' => PasswordType::class]);
        $html = $this->renderRow($form->createView());

        $this->assertMatchesXpath($html, '//input[@type="password" and contains(@class, "h-9")]', 2);
    }

    public function testCollectionWidgetRendersAddAndRemoveAffordances(): void
    {
        $form = $this->factory->createNamed('skills', CollectionType::class, [new Skill('TS', 7)], [
            'entry_type' => SkillType::class,
            'allow_add' => true,
            'allow_delete' => true,
            'prototype' => true,
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//div[contains(@class, "shadcn-collection") and @data-collection="data-collection"]');
        $this->assertMatchesXpath($html, '//div/div[contains(@class, "shadcn-collection-row")]', 1);
        $this->assertMatchesXpath($html, '//button[contains(@class, "shadcn-collection-remove")]', 1);
        $this->assertMatchesXpath($html, '//button[contains(@class, "shadcn-collection-add") and contains(text(), "Add another")]');
    }

    public function testUuidAndUlidWidgets(): void
    {
        foreach ([UuidType::class, UlidType::class] as $type) {
            $form = $this->factory->createNamed('id', $type);
            $html = $this->renderWidget($form->createView());

            $this->assertMatchesXpath($html, '//input[@type="text" and contains(@class, "h-9")]');
        }
    }

    public function testSubmitButtonGetsDefaultVariantClasses(): void
    {
        $form = $this->factory->createNamed('save', SubmitType::class, null, ['label' => 'Save']);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//button[@type="submit" and contains(@class, "bg-primary") and contains(@class, "text-primary-foreground") and contains(@class, "h-9")]');
    }

    public function testButtonWithOutlineVariantViaAttribute(): void
    {
        $form = $this->factory->createNamed('back', SubmitType::class, null, [
            'label' => 'Back',
            'attr' => ['data-variant' => 'outline'],
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//button[contains(@class, "border-input") and contains(@class, "bg-background")]');
    }

    public function testResetButtonGetsSecondaryStylingByDefault(): void
    {
        $form = $this->factory->createNamed('reset', ResetType::class, null, [
            'label' => 'Reset',
            'attr' => ['class' => 'shadcn-reset'],
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertMatchesXpath($html, '//button[@type="reset" and contains(@class, "bg-secondary")]');
    }

    public function testRootFormErrorsRenderAsSummaryBlock(): void
    {
        $form = $this->factory->createNamed('app', \Symfony\Component\Form\Extension\Core\Type\FormType::class);
        $form->add('name', TextType::class);
        $form->addError(new FormError('Something is wrong.'));

        $html = $this->renderForm($form->createView());

        $this->assertMatchesXpath($html, '//div[contains(@class, "shadcn-form-error-summary")]');
        $this->assertStringContainsString('Something is wrong.', $html);
    }
}

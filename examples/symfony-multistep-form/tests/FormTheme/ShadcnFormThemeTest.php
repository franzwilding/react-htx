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
use Symfony\Component\Form\Extension\Core\Type\FormType;
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
 * Asserts that every native Symfony form type renders as the correct
 * kebab-case custom tag(s) so the reactolith client picks them up.
 *
 * The tests are intentionally string-based — the HTML is *not* XHTML, and
 * its only consumer is reactolith's parser, which is happy with hyphenated
 * tag names and `json-*` attributes that DOMDocument would refuse.
 */
class ShadcnFormThemeTest extends ShadcnFormThemeTestCase
{
    public function testFormRowWrapsEveryFieldInUiField(): void
    {
        $form = $this->factory->createNamed('first_name', TextType::class, null, [
            'label' => 'First name',
            'help' => 'How should we address you?',
        ]);

        $html = $this->renderRow($form->createView());

        $this->assertContainsTag($html, 'ui-field');
        $this->assertContainsTag($html, 'ui-field-label');
        $this->assertContainsTag($html, 'ui-input');
        $this->assertContainsTag($html, 'ui-field-description');
        $this->assertContainsTag($html, 'ui-field-error');
        $this->assertStringContainsString('name="first_name"', $html);
        $this->assertStringContainsString('How should we address you?', $html);
    }

    public function testRequiredFieldLabelCarriesRequiredAttribute(): void
    {
        $form = $this->factory->createNamed('email', EmailType::class, null, [
            'label' => 'Email',
            'required' => true,
        ]);

        $html = $this->renderRow($form->createView());

        $this->assertMatchesRegularExpression('#<ui-field-label[^>]+required#', $html);
    }

    public function testTextWidget(): void
    {
        $form = $this->factory->createNamed('name', TextType::class, 'Ada');
        $html = $this->renderWidget($form->createView());

        $this->assertContainsTag($html, 'ui-input');
        $this->assertStringContainsString('type="text"', $html);
        $this->assertStringContainsString('value="Ada"', $html);
    }

    public function testEmailWidget(): void
    {
        $form = $this->factory->createNamed('email', EmailType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertStringContainsString('type="email"', $html);
    }

    public function testSearchTelUrlWidgets(): void
    {
        foreach ([SearchType::class, TelType::class, UrlType::class] as $type) {
            $form = $this->factory->createNamed('q', $type);
            $html = $this->renderWidget($form->createView());

            $this->assertContainsTag($html, 'ui-input', 1);
        }
    }

    public function testPasswordWidget(): void
    {
        $form = $this->factory->createNamed('pwd', PasswordType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertStringContainsString('type="password"', $html);
    }

    public function testIntegerAndNumberWidgets(): void
    {
        foreach ([IntegerType::class, NumberType::class] as $type) {
            $form = $this->factory->createNamed('n', $type);
            $html = $this->renderWidget($form->createView());

            $this->assertContainsTag($html, 'ui-input', 1);
        }
    }

    public function testMoneyWidgetExposesPrefixSuffixAsDataAttrs(): void
    {
        $form = $this->factory->createNamed('salary', MoneyType::class, null, ['currency' => 'EUR']);
        $html = $this->renderWidget($form->createView());

        $this->assertContainsTag($html, 'ui-input');
        $this->assertMatchesRegularExpression('#data-(prefix|suffix)="#', $html);
    }

    public function testPercentWidgetExposesPercentSign(): void
    {
        $form = $this->factory->createNamed('rate', PercentType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertStringContainsString('data-suffix="%"', $html);
    }

    public function testRangeWidgetRendersAsUiSlider(): void
    {
        $form = $this->factory->createNamed('hours', RangeType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertContainsTag($html, 'ui-slider');
    }

    public function testColorWidgetRendersAsUiColor(): void
    {
        $form = $this->factory->createNamed('color', ColorType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertContainsTag($html, 'ui-color');
    }

    public function testHiddenWidgetStaysAsNativeInput(): void
    {
        $form = $this->factory->createNamed('token', HiddenType::class, 'abc');
        $html = $this->renderWidget($form->createView());

        $this->assertStringContainsString('type="hidden"', $html);
        $this->assertStringContainsString('value="abc"', $html);
    }

    public function testTextareaWidget(): void
    {
        $form = $this->factory->createNamed('bio', TextareaType::class, 'Hello');
        $html = $this->renderWidget($form->createView());

        $this->assertContainsTag($html, 'ui-textarea');
        $this->assertStringContainsString('value="Hello"', $html);
    }

    public function testCollapsedChoiceRendersAsUiSelectWithJsonValue(): void
    {
        $form = $this->factory->createNamed('country', ChoiceType::class, 'fr', [
            'choices' => ['Germany' => 'de', 'France' => 'fr'],
            'placeholder' => 'Pick one',
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertContainsTag($html, 'ui-select');
        $this->assertStringContainsString("json-value='&quot;fr&quot;'", $html);
        $this->assertStringContainsString('placeholder="Pick one"', $html);
        $this->assertStringContainsString('<option value="de">Germany</option>', $html);
        $this->assertStringContainsString('<option value="fr">France</option>', $html);
    }

    public function testExpandedRadioChoiceRendersAsUiRadioGroup(): void
    {
        $form = $this->factory->createNamed('plan', ChoiceType::class, 'pro', [
            'choices' => ['Free' => 'free', 'Pro' => 'pro'],
            'expanded' => true,
            'multiple' => false,
            'placeholder' => false,
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertContainsTag($html, 'ui-radio-group');
        $this->assertContainsTag($html, 'ui-radio-group-item', 2);
        $this->assertStringContainsString("json-value='&quot;pro&quot;'", $html);
    }

    public function testExpandedMultipleChoiceRendersAsUiCheckboxGroup(): void
    {
        $form = $this->factory->createNamed('interests', ChoiceType::class, ['frontend', 'backend'], [
            'choices' => ['Frontend' => 'frontend', 'Backend' => 'backend', 'Data' => 'data'],
            'expanded' => true,
            'multiple' => true,
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertContainsTag($html, 'ui-checkbox-group');
        $this->assertContainsTag($html, 'ui-checkbox-group-item', 3);
        $this->assertStringContainsString('json-value=', $html);
        $this->assertStringContainsString('frontend', $html);
        $this->assertStringContainsString('backend', $html);
    }

    public function testStandaloneCheckboxRowUsesCardLayoutWithUiCheckbox(): void
    {
        $form = $this->factory->createNamed('terms', CheckboxType::class, null, [
            'label' => 'I accept the terms',
            'help' => 'Required to continue.',
        ]);
        $html = $this->renderRow($form->createView());

        $this->assertContainsTag($html, 'ui-field');
        $this->assertContainsTag($html, 'ui-checkbox');
        $this->assertContainsTag($html, 'ui-field-label');
        $this->assertContainsTag($html, 'ui-field-description');
        $this->assertContainsTag($html, 'ui-field-error');
    }

    public function testCheckedCheckboxUsesJsonChecked(): void
    {
        $form = $this->factory->createNamed('terms', CheckboxType::class, true);
        $html = $this->renderWidget($form->createView());

        $this->assertStringContainsString('json-checked="true"', $html);
    }

    public function testFileWidgetRendersAsUiFile(): void
    {
        $form = $this->factory->createNamed('resume', FileType::class);
        $html = $this->renderWidget($form->createView());

        $this->assertContainsTag($html, 'ui-file');
    }

    public function testFileWidgetMultipleAppendsBracketsToName(): void
    {
        $form = $this->factory->createNamed('portfolio', FileType::class, null, ['multiple' => true]);
        $html = $this->renderWidget($form->createView());

        $this->assertStringContainsString('name="portfolio[]"', $html);
        $this->assertStringContainsString(' multiple', $html);
    }

    public function testDateWidgetSingleTextRendersAsUiInput(): void
    {
        $form = $this->factory->createNamed('dob', DateType::class, null, [
            'widget' => 'single_text',
            'input' => 'datetime_immutable',
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertContainsTag($html, 'ui-input');
        $this->assertStringContainsString('type="date"', $html);
    }

    public function testTimeAndDateTimeSingleTextWidgets(): void
    {
        $time = $this->factory->createNamed('t', TimeType::class, null, [
            'widget' => 'single_text',
            'input' => 'datetime_immutable',
        ]);
        $this->assertStringContainsString('type="time"', $this->renderWidget($time->createView()));

        $dt = $this->factory->createNamed('dt', DateTimeType::class, null, [
            'widget' => 'single_text',
            'input' => 'datetime_immutable',
        ]);
        $this->assertStringContainsString('type="datetime-local"', $this->renderWidget($dt->createView()));
    }

    public function testWeekWidgetSingleText(): void
    {
        $form = $this->factory->createNamed('w', WeekType::class, null, [
            'widget' => 'single_text',
            'input' => 'string',
        ]);
        $this->assertStringContainsString('type="week"', $this->renderWidget($form->createView()));
    }

    public function testBirthdayWidget(): void
    {
        $form = $this->factory->createNamed('dob', BirthdayType::class, null, [
            'widget' => 'single_text',
            'input' => 'datetime_immutable',
        ]);
        $this->assertStringContainsString('type="date"', $this->renderWidget($form->createView()));
    }

    public function testDateIntervalIntegerVariantUsesLabeledUiInputs(): void
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

        $this->assertContainsTag($html, 'ui-input', 3);
        $this->assertContainsTag($html, 'ui-field-label', 3);
    }

    public function testCountryLanguageLocaleTimezoneCurrencyRenderAsUiSelect(): void
    {
        foreach ([CountryType::class, LanguageType::class, LocaleType::class, TimezoneType::class, CurrencyType::class] as $type) {
            $form = $this->factory->createNamed('field', $type, null, ['placeholder' => 'Pick one']);
            $html = $this->renderWidget($form->createView());

            $this->assertContainsTag($html, 'ui-select', 1);
            $this->assertStringContainsString('<option', $html);
        }
    }

    public function testEnumWidget(): void
    {
        $form = $this->factory->createNamed('tier', EnumType::class, MembershipTier::Pro, [
            'class' => MembershipTier::class,
            'placeholder' => 'Pick one',
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertContainsTag($html, 'ui-select');
        $this->assertStringContainsString("json-value='&quot;pro&quot;'", $html);
        $this->assertStringContainsString('<option value="free">', $html);
    }

    public function testRepeatedPasswordRendersTwoUiInputs(): void
    {
        $form = $this->factory->createNamed('pwd', RepeatedType::class, null, ['type' => PasswordType::class]);
        $html = $this->renderRow($form->createView());

        $this->assertContainsTag($html, 'ui-input', 2);
        $this->assertSame(2, substr_count($html, 'type="password"'));
    }

    public function testCollectionWidgetRendersAsFlowCollectionWithPrototype(): void
    {
        $form = $this->factory->createNamed('skills', CollectionType::class, [new Skill('TS', 7)], [
            'entry_type' => SkillType::class,
            'allow_add' => true,
            'allow_delete' => true,
            'prototype' => true,
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertContainsTag($html, 'flow-collection');
        $this->assertContainsTag($html, 'flow-collection-row');
        $this->assertMatchesRegularExpression('#prototype="#', $html);
    }

    public function testUuidAndUlidWidgetsRenderAsUiInputs(): void
    {
        foreach ([UuidType::class, UlidType::class] as $type) {
            $form = $this->factory->createNamed('id', $type);
            $html = $this->renderWidget($form->createView());

            $this->assertContainsTag($html, 'ui-input');
        }
    }

    public function testSubmitButtonGetsDefaultVariant(): void
    {
        $form = $this->factory->createNamed('save', SubmitType::class, null, ['label' => 'Save']);
        $html = $this->renderWidget($form->createView());

        $this->assertContainsTag($html, 'ui-button');
        $this->assertStringContainsString('variant="default"', $html);
        $this->assertStringContainsString('type="submit"', $html);
        $this->assertStringContainsString('>Save<', $html);
    }

    public function testButtonWithPreviousActionUsesOutlineVariant(): void
    {
        $form = $this->factory->createNamed('back', SubmitType::class, null, [
            'label' => 'Back',
            'attr' => ['data-action' => 'previous'],
        ]);
        $html = $this->renderWidget($form->createView());

        $this->assertStringContainsString('variant="outline"', $html);
        $this->assertStringContainsString('data-action="previous"', $html);
    }

    public function testResetButton(): void
    {
        $form = $this->factory->createNamed('reset', ResetType::class, null, ['label' => 'Reset']);
        $html = $this->renderWidget($form->createView());

        $this->assertContainsTag($html, 'ui-button');
        $this->assertStringContainsString('type="reset"', $html);
    }

    public function testRootFormErrorsAreSerialisedToJsonErrorsAttribute(): void
    {
        $form = $this->factory->createNamed('app', FormType::class);
        $form->add('email', EmailType::class);
        $form->submit(['email' => 'not-an-email']);
        $form->get('email')->addError(new FormError('This is not a valid email address.'));

        $html = $this->renderForm($form->createView());

        $this->assertStringContainsString('<my-form', $html);
        $this->assertStringContainsString('json-errors=', $html);
        // Twig's `html_attr` escaper encodes spaces as `&#x20;` inside attribute
        // values; reactolith's HTML parser undoes the escaping before parsing
        // the JSON, so the original message round-trips intact on the client.
        $this->assertStringContainsString(
            'This&#x20;is&#x20;not&#x20;a&#x20;valid&#x20;email&#x20;address.',
            $html,
        );
    }
}

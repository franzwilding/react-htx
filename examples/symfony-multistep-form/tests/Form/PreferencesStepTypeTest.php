<?php

declare(strict_types=1);

namespace App\Tests\Form;

use App\Form\Step\PreferencesStepType;
use App\Model\MembershipTier;
use App\Model\Preferences;
use Symfony\Component\Form\Test\TypeTestCase;

class PreferencesStepTypeTest extends TypeTestCase
{
    public function testHasEveryAdvancedFieldType(): void
    {
        $form = $this->factory->create(PreferencesStepType::class);

        $this->assertSame(Preferences::class, $form->getConfig()->getOption('data_class'));

        foreach ([
            'interests',
            'newsletterFrequency',
            'acceptsTerms',
            'subscribesToTips',
            'favoriteColor',
            'searchQuery',
            'password',
            'bio',
            'membership',
            'referralCode',
        ] as $field) {
            $this->assertTrue($form->has($field), \sprintf('Expected the preferences step to expose the "%s" field.', $field));
        }
    }

    public function testRepeatedPasswordIsAccepted(): void
    {
        $form = $this->factory->create(PreferencesStepType::class);
        $form->submit([
            'interests' => ['frontend', 'backend'],
            'newsletterFrequency' => 'weekly',
            'acceptsTerms' => '1',
            'subscribesToTips' => null,
            'favoriteColor' => '#3366ff',
            'searchQuery' => '',
            'password' => ['first' => 'sup3r-secret', 'second' => 'sup3r-secret'],
            'bio' => 'Hello world.',
            'membership' => 'pro',
            'referralCode' => 'WELCOME',
        ]);

        $this->assertTrue($form->isSynchronized());
        /** @var Preferences $prefs */
        $prefs = $form->getData();
        $this->assertSame('sup3r-secret', $prefs->password);
        $this->assertSame(['frontend', 'backend'], $prefs->interests);
        $this->assertSame(MembershipTier::Pro, $prefs->membership);
        $this->assertTrue($prefs->acceptsTerms);
    }
}

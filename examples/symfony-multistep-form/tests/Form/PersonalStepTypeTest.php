<?php

declare(strict_types=1);

namespace App\Tests\Form;

use App\Form\Step\PersonalStepType;
use App\Model\Personal;
use Symfony\Component\Form\Test\TypeTestCase;

class PersonalStepTypeTest extends TypeTestCase
{
    public function testBuildsFormBoundToPersonalDataClass(): void
    {
        $form = $this->factory->create(PersonalStepType::class);

        $this->assertSame(Personal::class, $form->getConfig()->getOption('data_class'));
        $this->assertTrue($form->has('firstName'));
        $this->assertTrue($form->has('lastName'));
        $this->assertTrue($form->has('email'));
        $this->assertTrue($form->has('phone'));
        $this->assertTrue($form->has('dateOfBirth'));
        $this->assertTrue($form->has('gender'));
        $this->assertTrue($form->has('website'));
    }

    public function testSubmissionMapsToModel(): void
    {
        $form = $this->factory->create(PersonalStepType::class);
        $form->submit([
            'firstName' => 'Ada',
            'lastName' => 'Lovelace',
            'email' => 'ada@example.com',
            'phone' => '+44 20 7946 0958',
            'dateOfBirth' => '1815-12-10',
            'gender' => 'female',
            'website' => 'https://ada.example.com',
        ]);

        $this->assertTrue($form->isSynchronized());
        /** @var Personal $personal */
        $personal = $form->getData();
        $this->assertSame('Ada', $personal->firstName);
        $this->assertSame('ada@example.com', $personal->email);
        $this->assertEquals(new \DateTimeImmutable('1815-12-10'), $personal->dateOfBirth);
        $this->assertSame('female', $personal->gender);
    }
}

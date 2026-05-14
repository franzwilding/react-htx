<?php

declare(strict_types=1);

namespace App\Tests\Model;

use App\Model\Application;
use PHPUnit\Framework\TestCase;

class ApplicationTest extends TestCase
{
    public function testDefaultStateStartsOnPersonalStep(): void
    {
        $app = new Application();

        $this->assertSame(Application::STEP_PERSONAL, $app->currentStep);
        $this->assertSame([
            'personal',
            'address',
            'employment',
            'preferences',
            'documents',
            'confirm',
        ], Application::STEPS);
    }

    public function testStepConstantsAreUnique(): void
    {
        $this->assertCount(count(Application::STEPS), array_unique(Application::STEPS));
    }
}

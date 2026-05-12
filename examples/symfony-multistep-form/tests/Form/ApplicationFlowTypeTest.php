<?php

declare(strict_types=1);

namespace App\Tests\Form;

use App\Form\Flow\ApplicationFlowType;
use App\Model\Application;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Form\Flow\DataStorage\InMemoryDataStorage;
use Symfony\Component\Form\Flow\FormFlowInterface;
use Symfony\Component\Form\Forms;
use Symfony\Component\HttpFoundation\RequestStack;

class ApplicationFlowTypeTest extends TestCase
{
    public function testFlowExposesEveryStepInTheRightOrder(): void
    {
        $flow = $this->createFlow();

        $this->assertSame(Application::STEPS, $flow->getCursor()->getSteps());
        $this->assertSame(Application::STEP_PERSONAL, $flow->getCursor()->getCurrentStep());
        $this->assertCount(6, $flow->getCursor()->getSteps());
    }

    public function testInitialCursorIsAtFirstStep(): void
    {
        $flow = $this->createFlow();

        $this->assertTrue($flow->getCursor()->isFirstStep());
        $this->assertFalse($flow->getCursor()->isLastStep());
        $this->assertSame(0, $flow->getCursor()->getStepIndex());
    }

    public function testNavigatorIsAttachedToTheFlow(): void
    {
        $flow = $this->createFlow();

        $this->assertTrue($flow->has('navigator'));

        // On the first step, FormFlow only includes the buttons whose
        // include_if predicate matches: `next` is always reachable, but
        // `previous` (canMoveBack) and `finish` (isLastStep) are filtered out.
        $navigator = $flow->get('navigator');
        $this->assertTrue($navigator->has('next'), 'Next button must be available on the first step.');
        $this->assertFalse($navigator->has('previous'), 'Previous button must be hidden on the first step.');
        $this->assertFalse($navigator->has('finish'), 'Finish button must be hidden until the last step.');
    }

    public function testValidationGroupsScopeToCurrentStep(): void
    {
        $flow = $this->createFlow();

        $groupsResolver = $flow->getConfig()->getOption('validation_groups');
        $groups = \is_callable($groupsResolver) ? $groupsResolver($flow) : $groupsResolver;

        $this->assertSame(['Default', Application::STEP_PERSONAL], $groups);
    }

    public function testDataClassIsApplication(): void
    {
        $flow = $this->createFlow();

        $this->assertSame(Application::class, $flow->getConfig()->getOption('data_class'));
    }

    private function createFlow(): FormFlowInterface
    {
        $factory = Forms::createFormFactoryBuilder()
            ->addType(new ApplicationFlowType(new RequestStack()))
            ->getFormFactory();

        $form = $factory->create(ApplicationFlowType::class, new Application(), [
            'data_storage' => new InMemoryDataStorage('test'),
        ]);

        if (!$form instanceof FormFlowInterface) {
            throw new \LogicException('Expected a FormFlowInterface, got '.get_class($form));
        }

        return $form;
    }
}

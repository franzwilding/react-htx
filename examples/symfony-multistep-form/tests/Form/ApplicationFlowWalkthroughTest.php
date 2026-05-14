<?php

declare(strict_types=1);

namespace App\Tests\Form;

use App\Form\Flow\ApplicationFlowType;
use App\Model\Application;
use App\Model\MembershipTier;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Form\Extension\Validator\ValidatorExtension as FormValidatorExtension;
use Symfony\Component\Form\Flow\DataStorage\InMemoryDataStorage;
use Symfony\Component\Form\Flow\FormFlowInterface;
use Symfony\Component\Form\Forms;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Uid\Ulid;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validation;

/**
 * Drives the multi-step flow end-to-end with valid submissions for each step
 * and asserts that the cursor advances, validation groups switch, and the
 * collected data is preserved across requests.
 */
class ApplicationFlowWalkthroughTest extends TestCase
{
    public function testSubmittingNextOnPersonalStepAdvancesToAddress(): void
    {
        $flow = $this->createFlow();
        $this->assertSame(Application::STEP_PERSONAL, $flow->getCursor()->getCurrentStep());

        $flow->submit($this->submissionFor(Application::STEP_PERSONAL, [
            'personal' => [
                'firstName' => 'Ada',
                'lastName' => 'Lovelace',
                'email' => 'ada@example.com',
                'phone' => '+44 20 7946 0958',
                'dateOfBirth' => '1990-12-10',
                'gender' => 'female',
                'website' => 'https://ada.example.com',
            ],
        ]));

        $this->assertTrue($flow->isSubmitted());
        $this->assertTrue($flow->isValid(), $this->describeErrors($flow));
        $next = $flow->getStepForm();
        $this->assertSame(Application::STEP_ADDRESS, $next->getCursor()->getCurrentStep());
        $this->assertSame('Ada', $next->getData()->personal->firstName);
    }

    public function testWalkThroughAllStepsAndFinish(): void
    {
        $storage = new InMemoryDataStorage('walkthrough');
        $flow = $this->createFlow($storage);

        $flow = $this->submitStep($flow, Application::STEP_PERSONAL, [
            'personal' => [
                'firstName' => 'Ada',
                'lastName' => 'Lovelace',
                'email' => 'ada@example.com',
                'phone' => '+44 20 7946 0958',
                'dateOfBirth' => '1990-12-10',
                'gender' => 'female',
                'website' => 'https://ada.example.com',
            ],
        ]);
        $this->assertSame(Application::STEP_ADDRESS, $flow->getCursor()->getCurrentStep());

        $flow = $this->submitStep($flow, Application::STEP_ADDRESS, [
            'address' => [
                'street' => '221B Baker Street',
                'city' => 'London',
                'postalCode' => 'NW1 6XE',
                'country' => 'GB',
                'preferredLanguage' => 'en',
                'locale' => 'en_GB',
                'timezone' => 'Europe/London',
            ],
        ]);
        $this->assertSame(Application::STEP_EMPLOYMENT, $flow->getCursor()->getCurrentStep());

        $flow = $this->submitStep($flow, Application::STEP_EMPLOYMENT, [
            'employment' => [
                'company' => 'Analytical Engines Ltd',
                'status' => 'employed',
                'annualSalary' => '85000',
                'salaryCurrency' => 'GBP',
                'taxRate' => '0.3',
                'yearsOfExperience' => '12',
                'weeklyHours' => '40',
                'startDate' => '2020-01-15',
                'noticePeriod' => ['months' => '1', 'days' => '0'],
                'vacationWeek' => '2026-W30',
            ],
        ]);
        $this->assertSame(Application::STEP_PREFERENCES, $flow->getCursor()->getCurrentStep());

        $flow = $this->submitStep($flow, Application::STEP_PREFERENCES, [
            'preferences' => [
                'interests' => ['frontend', 'backend'],
                'newsletterFrequency' => 'weekly',
                'acceptsTerms' => '1',
                'subscribesToTips' => '1',
                'favoriteColor' => '#ff6699',
                'searchQuery' => '',
                'password' => ['first' => 'super-secret-password', 'second' => 'super-secret-password'],
                'bio' => 'Mathematician and the first computer programmer.',
                'membership' => MembershipTier::Pro->value,
                'referralCode' => 'WELCOME',
            ],
        ]);
        $this->assertSame(Application::STEP_DOCUMENTS, $flow->getCursor()->getCurrentStep());

        $flow = $this->submitStep($flow, Application::STEP_DOCUMENTS, [
            'documents' => [
                'skills' => [
                    ['name' => 'TypeScript', 'level' => '8'],
                    ['name' => 'PHP', 'level' => '9'],
                ],
                'accountId' => Uuid::v7()->toRfc4122(),
                'transactionId' => (new Ulid())->toBase32(),
            ],
        ]);
        $this->assertSame(Application::STEP_CONFIRM, $flow->getCursor()->getCurrentStep());

        // On the last step the navigator should now expose the Finish button.
        $this->assertTrue($flow->get('navigator')->has('finish'));

        // Submit the final confirmation step. The flow routes submission by
        // step name (`confirm`), and the inner checkbox is named `accepted`.
        $flow->submit([
            'confirm' => ['accepted' => '1'],
            'navigator' => ['finish' => ''],
        ]);
        $this->assertTrue($flow->isSubmitted());
        $this->assertTrue($flow->isFinished(), 'The flow should be marked finished after pressing Finish.');
    }

    private function submitStep(FormFlowInterface $flow, string $step, array $stepData): FormFlowInterface
    {
        $flow->submit($this->submissionFor($step, $stepData));
        $this->assertTrue($flow->isValid(), $this->describeErrors($flow));

        return $flow->getStepForm();
    }

    /**
     * Builds the submitted payload Symfony's form component would receive in a
     * POST request for the given step (data + next button + CSRF token).
     */
    private function submissionFor(string $step, array $stepData): array
    {
        return $stepData + [
            'navigator' => ['next' => ''],
        ];
    }

    private function describeErrors(FormFlowInterface $flow): string
    {
        $messages = [];
        foreach ($flow->getErrors(true) as $error) {
            $messages[] = $error->getOrigin()?->getName().': '.$error->getMessage();
        }

        return $messages ? "Errors:\n - ".implode("\n - ", $messages) : 'No errors reported.';
    }

    private function createFlow(?InMemoryDataStorage $storage = null): FormFlowInterface
    {
        $factory = Forms::createFormFactoryBuilder()
            ->addType(new ApplicationFlowType(new RequestStack()))
            ->addExtension(new FormValidatorExtension(Validation::createValidator()))
            ->getFormFactory();

        $form = $factory->create(ApplicationFlowType::class, new Application(), [
            'data_storage' => $storage ?? new InMemoryDataStorage('walkthrough'),
        ]);

        if (!$form instanceof FormFlowInterface) {
            throw new \LogicException('Expected a FormFlowInterface, got '.get_class($form));
        }

        return $form;
    }
}

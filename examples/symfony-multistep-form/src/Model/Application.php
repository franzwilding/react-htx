<?php

declare(strict_types=1);

namespace App\Model;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * Aggregate root for the multi-step application form.
 *
 * Each property is a sub-model whose constraints are scoped to a validation
 * group that matches the corresponding flow step name. The FormFlow component
 * sets the active validation_groups to ['Default', <current_step>] so only the
 * constraints for the current step are evaluated on every submission.
 */
class Application
{
    public const STEP_PERSONAL = 'personal';
    public const STEP_ADDRESS = 'address';
    public const STEP_EMPLOYMENT = 'employment';
    public const STEP_PREFERENCES = 'preferences';
    public const STEP_DOCUMENTS = 'documents';
    public const STEP_CONFIRM = 'confirm';

    public const STEPS = [
        self::STEP_PERSONAL,
        self::STEP_ADDRESS,
        self::STEP_EMPLOYMENT,
        self::STEP_PREFERENCES,
        self::STEP_DOCUMENTS,
        self::STEP_CONFIRM,
    ];

    public function __construct(
        #[Assert\Valid(groups: ['personal'])]
        public Personal $personal = new Personal(),

        #[Assert\Valid(groups: ['address'])]
        public Address $address = new Address(),

        #[Assert\Valid(groups: ['employment'])]
        public Employment $employment = new Employment(),

        #[Assert\Valid(groups: ['preferences'])]
        public Preferences $preferences = new Preferences(),

        #[Assert\Valid(groups: ['documents'])]
        public Documents $documents = new Documents(),

        public string $currentStep = self::STEP_PERSONAL,
    ) {
    }
}

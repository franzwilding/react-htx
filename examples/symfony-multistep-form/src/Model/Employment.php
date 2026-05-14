<?php

declare(strict_types=1);

namespace App\Model;

use Symfony\Component\Validator\Constraints as Assert;

class Employment
{
    public function __construct(
        public ?string $company = null,

        #[Assert\Choice(
            choices: ['employed', 'self_employed', 'student', 'between_jobs', 'retired'],
            groups: ['employment'],
        )]
        public ?string $status = null,

        #[Assert\Positive(groups: ['employment'])]
        public ?float $annualSalary = null,

        #[Assert\Currency(groups: ['employment'])]
        public ?string $salaryCurrency = null,

        #[Assert\Range(min: 0, max: 100, groups: ['employment'])]
        public ?float $taxRate = null,

        #[Assert\Range(min: 0, max: 60, groups: ['employment'])]
        public ?int $yearsOfExperience = null,

        #[Assert\Range(min: 0, max: 80, groups: ['employment'])]
        public ?int $weeklyHours = null,

        public ?\DateTimeImmutable $startDate = null,

        public ?\DateTimeImmutable $preferredMeetingTime = null,

        public ?\DateTimeImmutable $lastPromotionAt = null,

        public ?\DateInterval $noticePeriod = null,

        public ?string $vacationWeek = null,
    ) {
    }
}

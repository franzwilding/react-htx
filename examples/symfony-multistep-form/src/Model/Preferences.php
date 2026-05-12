<?php

declare(strict_types=1);

namespace App\Model;

use Symfony\Component\Validator\Constraints as Assert;

class Preferences
{
    public function __construct(
        /** @var list<string> */
        #[Assert\Count(min: 1, groups: ['preferences'])]
        public array $interests = [],

        #[Assert\NotBlank(groups: ['preferences'])]
        #[Assert\Choice(choices: ['daily', 'weekly', 'monthly', 'never'], groups: ['preferences'])]
        public ?string $newsletterFrequency = null,

        #[Assert\IsTrue(message: 'You must accept the terms.', groups: ['preferences'])]
        public bool $acceptsTerms = false,

        public bool $subscribesToTips = false,

        #[Assert\NotBlank(groups: ['preferences'])]
        #[Assert\CssColor(groups: ['preferences'])]
        public ?string $favoriteColor = null,

        public ?string $searchQuery = null,

        #[Assert\NotBlank(groups: ['preferences'])]
        #[Assert\Length(min: 8, max: 72, groups: ['preferences'])]
        public ?string $password = null,

        #[Assert\Length(max: 1000, groups: ['preferences'])]
        public ?string $bio = null,

        public ?MembershipTier $membership = MembershipTier::Free,

        public ?string $referralCode = null,
    ) {
    }
}

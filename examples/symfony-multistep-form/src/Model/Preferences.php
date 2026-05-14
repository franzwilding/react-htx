<?php

declare(strict_types=1);

namespace App\Model;

use Symfony\Component\Validator\Constraints as Assert;

class Preferences
{
    public function __construct(
        /** @var list<string> */
        public array $interests = [],

        #[Assert\Choice(choices: ['daily', 'weekly', 'monthly', 'never'], groups: ['preferences'])]
        public ?string $newsletterFrequency = null,

        public bool $acceptsTerms = false,

        public bool $subscribesToTips = false,

        #[Assert\CssColor(groups: ['preferences'])]
        public ?string $favoriteColor = null,

        public ?string $searchQuery = null,

        #[Assert\Length(min: 8, max: 72, groups: ['preferences'])]
        public ?string $password = null,

        #[Assert\Length(max: 1000, groups: ['preferences'])]
        public ?string $bio = null,

        public ?MembershipTier $membership = MembershipTier::Free,

        public ?string $referralCode = null,
    ) {
    }
}

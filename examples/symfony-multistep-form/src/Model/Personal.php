<?php

declare(strict_types=1);

namespace App\Model;

use Symfony\Component\Validator\Constraints as Assert;

class Personal
{
    public function __construct(
        #[Assert\NotBlank(groups: ['personal'])]
        #[Assert\Length(min: 2, max: 64, groups: ['personal'])]
        public ?string $firstName = null,

        #[Assert\NotBlank(groups: ['personal'])]
        #[Assert\Length(min: 2, max: 64, groups: ['personal'])]
        public ?string $lastName = null,

        #[Assert\NotBlank(groups: ['personal'])]
        #[Assert\Email(groups: ['personal'])]
        public ?string $email = null,

        #[Assert\NotBlank(groups: ['personal'])]
        public ?string $phone = null,

        #[Assert\NotNull(groups: ['personal'])]
        #[Assert\LessThan('-18 years', groups: ['personal'])]
        public ?\DateTimeImmutable $dateOfBirth = null,

        #[Assert\NotBlank(groups: ['personal'])]
        #[Assert\Choice(choices: ['female', 'male', 'non_binary', 'prefer_not'], groups: ['personal'])]
        public ?string $gender = null,

        #[Assert\Url(groups: ['personal'])]
        public ?string $website = null,
    ) {
    }
}

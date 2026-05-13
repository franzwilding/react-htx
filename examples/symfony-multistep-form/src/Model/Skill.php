<?php

declare(strict_types=1);

namespace App\Model;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * One row in the collection of skills the applicant lists on the documents step.
 */
class Skill
{
    public function __construct(
        #[Assert\Length(min: 2, max: 64, groups: ['documents'])]
        public ?string $name = null,

        #[Assert\Range(min: 1, max: 10, groups: ['documents'])]
        public ?int $level = null,
    ) {
    }
}

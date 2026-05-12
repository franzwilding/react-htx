<?php

declare(strict_types=1);

namespace App\Model;

use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Uid\Ulid;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

class Documents
{
    public function __construct(
        #[Assert\NotNull(groups: ['documents'])]
        #[Assert\File(maxSize: '5M', mimeTypes: ['application/pdf'], groups: ['documents'])]
        public ?File $resume = null,

        /** @var list<File> */
        #[Assert\All([
            new Assert\File(maxSize: '5M', mimeTypes: ['image/jpeg', 'image/png', 'application/pdf']),
        ])]
        public array $portfolio = [],

        /** @var list<Skill> */
        #[Assert\Valid(groups: ['documents'])]
        #[Assert\Count(min: 1, max: 20, groups: ['documents'])]
        public array $skills = [],

        public ?Uuid $accountId = null,

        public ?Ulid $transactionId = null,
    ) {
        $this->accountId ??= Uuid::v7();
        $this->transactionId ??= new Ulid();
    }
}

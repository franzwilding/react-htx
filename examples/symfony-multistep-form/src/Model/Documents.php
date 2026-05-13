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
        #[Assert\File(maxSize: '5M', mimeTypes: ['application/pdf'], groups: ['documents'])]
        public ?File $resume = null,

        /** @var list<File> */
        #[Assert\All([
            new Assert\File(maxSize: '5M', mimeTypes: ['image/jpeg', 'image/png', 'application/pdf']),
        ])]
        public array $portfolio = [],

        /** @var list<Skill> */
        #[Assert\Valid(groups: ['documents'])]
        public array $skills = [],

        public ?Uuid $accountId = null,

        public ?Ulid $transactionId = null,
    ) {
        $this->accountId ??= Uuid::v7();
        $this->transactionId ??= new Ulid();
    }

    /**
     * Symfony FormFlow persists the model into the session between steps via
     * `serialize()`. `SplFileInfo` (and thus `File`) blocks the default
     * serialization protocol, so we dehydrate File objects down to their
     * filesystem paths and rehydrate them on the way back. The files
     * themselves live in a temp directory (moved there by
     * `DocumentsStepType`'s SUBMIT listener) and stay there until the flow
     * finishes.
     */
    public function __serialize(): array
    {
        return [
            'resume' => $this->resume?->getPathname(),
            'portfolio' => array_map(static fn (File $f): string => $f->getPathname(), $this->portfolio),
            'skills' => $this->skills,
            'accountId' => $this->accountId,
            'transactionId' => $this->transactionId,
        ];
    }

    public function __unserialize(array $data): void
    {
        $this->resume = isset($data['resume']) && is_file($data['resume'])
            ? new File($data['resume'])
            : null;
        $this->portfolio = array_values(array_filter(array_map(
            static fn (?string $p): ?File => $p !== null && is_file($p) ? new File($p) : null,
            $data['portfolio'] ?? [],
        )));
        $this->skills = $data['skills'] ?? [];
        $this->accountId = $data['accountId'] ?? null;
        $this->transactionId = $data['transactionId'] ?? null;
    }
}

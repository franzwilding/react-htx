<?php

declare(strict_types=1);

namespace App\Model;

use Symfony\Component\Validator\Constraints as Assert;

class Address
{
    public function __construct(
        #[Assert\NotBlank(groups: ['address'])]
        #[Assert\Length(max: 128, groups: ['address'])]
        public ?string $street = null,

        #[Assert\NotBlank(groups: ['address'])]
        #[Assert\Length(max: 64, groups: ['address'])]
        public ?string $city = null,

        #[Assert\NotBlank(groups: ['address'])]
        #[Assert\Regex(pattern: '/^[A-Z0-9\\- ]{3,12}$/i', groups: ['address'])]
        public ?string $postalCode = null,

        #[Assert\NotBlank(groups: ['address'])]
        #[Assert\Country(groups: ['address'])]
        public ?string $country = null,

        #[Assert\NotBlank(groups: ['address'])]
        #[Assert\Language(groups: ['address'])]
        public ?string $preferredLanguage = null,

        #[Assert\NotBlank(groups: ['address'])]
        #[Assert\Locale(canonicalize: true, groups: ['address'])]
        public ?string $locale = null,

        #[Assert\NotBlank(groups: ['address'])]
        #[Assert\Timezone(groups: ['address'])]
        public ?string $timezone = null,
    ) {
    }
}

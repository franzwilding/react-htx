<?php

declare(strict_types=1);

namespace App\Model;

use Symfony\Component\Validator\Constraints as Assert;

class Address
{
    public function __construct(
        #[Assert\Length(max: 128, groups: ['address'])]
        public ?string $street = null,

        #[Assert\Length(max: 64, groups: ['address'])]
        public ?string $city = null,

        #[Assert\Regex(pattern: '/^[A-Z0-9\- ]{3,12}$/i', groups: ['address'])]
        public ?string $postalCode = null,

        #[Assert\Country(groups: ['address'])]
        public ?string $country = null,

        #[Assert\Language(groups: ['address'])]
        public ?string $preferredLanguage = null,

        #[Assert\Locale(canonicalize: true, groups: ['address'])]
        public ?string $locale = null,

        #[Assert\Timezone(groups: ['address'])]
        public ?string $timezone = null,
    ) {
    }
}

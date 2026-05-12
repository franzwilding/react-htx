<?php

declare(strict_types=1);

namespace App\Model;

enum MembershipTier: string
{
    case Free = 'free';
    case Pro = 'pro';
    case Enterprise = 'enterprise';

    public function label(): string
    {
        return match ($this) {
            self::Free => 'Free — get started, no credit card',
            self::Pro => 'Pro — $19/month, all features',
            self::Enterprise => 'Enterprise — talk to sales',
        };
    }
}

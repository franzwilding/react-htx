<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ApplicationFlowControllerTest extends WebTestCase
{
    public function testFirstStepRendersThroughTheShadcnFormTheme(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/apply');

        $this->assertResponseIsSuccessful();
        $this->assertSelectorTextContains('h1', 'Apply for an account');
        $this->assertSelectorExists('form.shadcn-form-root');
        $this->assertSelectorExists('div.shadcn-form');
        $this->assertSelectorExists('ol.shadcn-flow-progress');
        $this->assertSelectorExists('input[type="email"].h-9');
        $this->assertSelectorExists('label.shadcn-required');
        $this->assertSelectorExists('div.shadcn-flow-navigator button');
    }

    public function testSubmittingValidFirstStepAdvancesToAddress(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/apply');

        $form = $crawler->selectButton('Continue')->form([
            'application_flow[personal][firstName]' => 'Ada',
            'application_flow[personal][lastName]' => 'Lovelace',
            'application_flow[personal][email]' => 'ada@example.com',
            'application_flow[personal][phone]' => '+44 20 7946 0958',
            'application_flow[personal][dateOfBirth]' => '1990-12-10',
            'application_flow[personal][gender]' => 'female',
            'application_flow[personal][website]' => 'https://ada.example.com',
        ]);

        $client->submit($form);

        $this->assertResponseIsSuccessful();
        $this->assertSelectorTextContains('p.text-muted-foreground, header p', 'Address');
        $this->assertSelectorExists('select[name="application_flow[address][country]"]');
    }

    public function testInvalidSubmissionRendersInlineShadcnFormMessages(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/apply');

        $form = $crawler->selectButton('Continue')->form([
            'application_flow[personal][firstName]' => '',
            'application_flow[personal][email]' => 'not-an-email',
        ]);

        $client->submit($form);

        // Symfony returns 422 for invalid form submissions; the HTML still
        // contains the re-rendered form with inline shadcn error messages.
        $this->assertResponseStatusCodeSame(422);
        $this->assertSelectorExists('input[aria-invalid="true"]');
        $this->assertSelectorExists('p.shadcn-form-message');
        $this->assertStringContainsString(
            'This value is not a valid email address',
            (string) $client->getResponse()->getContent(),
        );
    }
}

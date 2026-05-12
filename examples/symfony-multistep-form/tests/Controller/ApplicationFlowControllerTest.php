<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ApplicationFlowControllerTest extends WebTestCase
{
    public function testFirstStepRendersThroughTheReactolithFormTheme(): void
    {
        $client = static::createClient();
        $client->request('GET', '/apply');

        $this->assertResponseIsSuccessful();
        $body = (string) $client->getResponse()->getContent();

        // Every visual element is now a reactolith-resolved custom tag.
        $this->assertStringContainsString('<my-form', $body);
        $this->assertStringContainsString('<flow-progress', $body);
        $this->assertStringContainsString('<ui-field', $body);
        $this->assertStringContainsString('<ui-input', $body);
        $this->assertStringContainsString('<flow-navigator', $body);
        $this->assertStringContainsString('<ui-button', $body);

        // Vite asset URLs are emitted by pentatrion/vite-bundle.
        $this->assertSelectorExists('link[rel="stylesheet"][href^="/build/"]');
        $this->assertSelectorExists('script[src^="/build/"]');
    }

    public function testResponseAdvertisesPerComponentModulepreloadLinks(): void
    {
        $client = static::createClient();
        $client->request('GET', '/apply');

        $this->assertResponseIsSuccessful();
        $body = (string) $client->getResponse()->getContent();

        // Every `<ui-*>` / `<flow-*>` tag on the page should yield a
        // `<link rel="modulepreload">` for its chunk.
        $this->assertMatchesRegularExpression(
            '#<link rel="modulepreload"[^>]*assets/input-[^"]+\.js"#',
            $body,
            'Expected the `<ui-input>` chunk to be preloaded.',
        );
        $this->assertMatchesRegularExpression(
            '#<link rel="modulepreload"[^>]*assets/progress-[^"]+\.js"#',
            $body,
            'Expected the `<flow-progress>` chunk to be preloaded.',
        );

        // Same hints are also exposed as HTTP `Link:` headers so an HTTP/2
        // server can flush them via `103 Early Hints`.
        $linkHeaders = $client->getResponse()->headers->all('link');
        $this->assertNotEmpty($linkHeaders, 'Link headers must be emitted.');
        $joined = implode(', ', $linkHeaders);
        $this->assertStringContainsString('rel=modulepreload', $joined);
    }

    public function testInvalidSubmissionEmitsJsonErrorsOnMyForm(): void
    {
        $client = static::createClient();

        // We POST manually rather than crawling because the server emits
        // `<my-form>` (a reactolith custom tag), not a native `<form>` —
        // pre-hydration, DomCrawler's `->form()` doesn't know how to drive it.
        // The client still gets the same submission Symfony would parse from
        // a browser-submitted form.
        $client->request('POST', '/apply', [
            'application_flow' => [
                'personal' => [
                    'firstName' => '',
                    'email' => 'not-an-email',
                ],
                'navigator' => ['next' => ''],
            ],
        ]);

        $this->assertResponseStatusCodeSame(422);
        $body = (string) $client->getResponse()->getContent();
        $this->assertStringContainsString('<my-form', $body);
        $this->assertStringContainsString('json-errors=', $body);
        // Error message arrives `html_attr`-encoded inside the json-errors
        // attribute; reactolith's HTML parser decodes it before parsing JSON.
        $this->assertStringContainsString(
            'This&#x20;value&#x20;is&#x20;not&#x20;a&#x20;valid&#x20;email&#x20;address.',
            $body,
        );
    }

    public function testFlowAdvancesToAddressOnValidSubmission(): void
    {
        $client = static::createClient();
        $client->request('POST', '/apply', [
            'application_flow' => [
                'personal' => [
                    'firstName' => 'Ada',
                    'lastName' => 'Lovelace',
                    'email' => 'ada@example.com',
                    'phone' => '+44 20 7946 0958',
                    'dateOfBirth' => '1990-12-10',
                    'gender' => 'female',
                    'website' => 'https://ada.example.com',
                ],
                'navigator' => ['next' => ''],
            ],
        ]);

        $this->assertResponseIsSuccessful();
        $body = (string) $client->getResponse()->getContent();
        $this->assertStringContainsString('Address', $body);
        $this->assertStringContainsString('application_flow[address][country]', $body);
    }
}

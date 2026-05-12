# Symfony Multi-Step Form, the reactolith way

A complete, working **Symfony 8** application that demonstrates how to drive
[reactolith](https://github.com/reactolith/reactolith) from a server-rendered
multi-step form. Symfony's native [`FormFlow`](https://symfony.com/blog/new-in-symfony-7-4-multi-step-forms)
component handles the steps, validation groups and cursor; the Twig form theme
emits **kebab-case custom tags** (`<my-form>`, `<ui-input>`, `<ui-field>`,
`<flow-progress>` …) that reactolith resolves to **shadcn/ui-style React
components** on the client.

The Twig view is one line:

```twig
{# templates/application/flow.html.twig #}
{% form_theme form 'form/shadcn_form_theme.html.twig' %}
{{ form(form) }}
```

That emits HTML like this:

```html
<my-form action="/apply" method="post"
         json-errors='[{"name":"application_flow[personal][email]","message":"Already taken"}]'>
  <flow-progress json-steps='[{"name":"personal","label":"Personal","position":1,"isCurrent":true}, …]'></flow-progress>

  <ui-field name="application_flow[personal][email]">
    <ui-field-label html-for="application_flow_personal_email" required>Email address</ui-field-label>
    <ui-input name="application_flow[personal][email]" id="…" type="email" value="ada@example.com" required></ui-input>
    <ui-field-description id="…_help">We will never share this with anyone.</ui-field-description>
    <ui-field-error name="application_flow[personal][email]"></ui-field-error>
  </ui-field>

  <flow-navigator>
    <ui-button type="submit" variant="default" data-action="next">Continue</ui-button>
  </flow-navigator>
</my-form>
```

reactolith hydrates every hyphenated tag into the matching React component.
`<my-form>` is the reactolith `<Form>` (intercepts submits, exposes
`useFormErrors(name)` / `useFormSubmitting()`); `<ui-input>` is a shadcn-style
input that auto-flips to `aria-invalid` when its field has an error;
`<flow-progress>` reads `json-steps` and draws the progress bar; everything
that isn't a hyphenated tag (`<div>`, `<p>`, `<option>`) stays plain DOM.

When the user submits an invalid step, Symfony re-renders the same template
with new values *and* a `json-errors` payload on `<my-form>`. reactolith
morphs the new HTML over the live React tree — focus, scroll, and any open
dropdown state survive untouched.

---

## What's in this example

The form is split into 6 steps; collectively they exercise **every native
Symfony form field type**, each mapped to a custom reactolith tag:

| Symfony type | Twig theme emits | React component |
| --- | --- | --- |
| `TextType`, `EmailType`, `TelType`, `UrlType`, `SearchType`, `PasswordType`, `IntegerType`, `NumberType`, `BirthdayType`, `DateType` (single_text), `TimeType`, `DateTimeType`, `WeekType`, `MoneyType`, `PercentType`, `UuidType`, `UlidType` | `<ui-input type="…">` | `Input` |
| `TextareaType` | `<ui-textarea value="…">` | `Textarea` |
| `ChoiceType` (collapsed), `CountryType`, `LanguageType`, `LocaleType`, `TimezoneType`, `CurrencyType`, `EnumType` | `<ui-select json-value='…'>` + `<option>` | `Select` |
| `ChoiceType` (expanded, single) | `<ui-radio-group json-value='…'>` + `<ui-radio-group-item>` | `RadioGroup` / `RadioGroupItem` |
| `ChoiceType` (expanded, multiple) | `<ui-checkbox-group json-value='[…]'>` + `<ui-checkbox-group-item>` | `CheckboxGroup` / `CheckboxGroupItem` |
| `CheckboxType` (standalone) | `<ui-field>` + `<ui-checkbox json-checked="true">` card | `Checkbox` |
| `RangeType` | `<ui-slider min max step>` | `Slider` (with live readout) |
| `ColorType` | `<ui-color value="#…">` | `ColorPicker` |
| `FileType` (single + multiple) | `<ui-file>` | `FileInput` |
| `CollectionType` (with `data-prototype`) | `<flow-collection>` + `<flow-collection-row>` | `Collection` (client-side add/remove) |
| `DateIntervalType` (multi-widget) | nested `<ui-input>`s + `<ui-field-label>`s | composed inline |
| `HiddenType` | native `<input type="hidden">` | (stays plain DOM) |
| Buttons (`SubmitType`, `ButtonType`, `ResetType`, FormFlow nav) | `<ui-button variant="…" data-action="…">` | `Button` (uses `useFormSubmitting`) |
| FormFlow navigator | `<flow-navigator>` | `FlowNavigator` |
| FormFlow cursor | `<flow-progress json-steps='[…]'>` | `FlowProgress` |
| Root `<form>` | `<my-form action="…" method="…" json-errors='[…]'>` | reactolith `Form` |

Errors are flattened to a single list of `{name, id, message}` and attached
as `json-errors` on `<my-form>`. Each `<ui-field-error name="…">` picks up its
errors via `useFormErrors(name)`.

---

## Run it

Install the PHP and JS dependencies, build the bundle, then serve:

```bash
composer install
npm install
npm run build
```

```bash
php -S 127.0.0.1:8000 -t public
open http://127.0.0.1:8000/apply
```

Requires PHP 8.2+, Composer, and Node 18+. The example uses the PHP built-in
web server so there's no dependency on `symfony/cli` — though `symfony serve`
works too.

For an HMR dev loop, run Vite alongside the PHP server. `pentatrion/vite-bundle`
automatically switches between dev and built assets based on `APP_ENV`:

```bash
npm run dev
```

---

## Test it

The example is **fully TDD** with 54 PHPUnit tests / 189 assertions:

- **Theme tests** ([`tests/FormTheme/ShadcnFormThemeTest.php`](tests/FormTheme/ShadcnFormThemeTest.php))
  render each Symfony form type through the theme and assert the right
  custom tag is emitted, that error payloads are correctly encoded, and that
  boolean values are propagated as `json-checked` / `json-value`.
- **FormFlow navigator tests** ([`tests/FormTheme/ShadcnFlowNavigatorTest.php`](tests/FormTheme/ShadcnFlowNavigatorTest.php))
  confirm the navigator buttons render with the right `data-action` attribute
  and that `<flow-progress>` serializes the cursor state.
- **Flow walkthrough** ([`tests/Form/ApplicationFlowWalkthroughTest.php`](tests/Form/ApplicationFlowWalkthroughTest.php))
  drives every step end-to-end and asserts the cursor advances.
- **Preload tests** ([`tests/Preload/`](tests/Preload/)) cover the manifest
  resolver (tag → chunk, multi-segment fallback, transitive imports, CSS
  sidecars) and the kernel.response subscriber (head injection ordering,
  Link header emission, no-op cases for non-HTML / subrequests / pages with
  no custom elements).
- **Controller tests** ([`tests/Controller/ApplicationFlowControllerTest.php`](tests/Controller/ApplicationFlowControllerTest.php))
  boot the Symfony kernel, GET `/apply`, POST valid + invalid data, assert
  the response markup, and verify per-component modulepreload links are
  injected into the live HTML.

```bash
composer install
vendor/bin/phpunit
```

---

## How the pieces fit together

```
┌────────────────────────────────────────────────────────────────┐
│  Symfony 8 backend                                             │
│                                                                │
│  Application (model, 6 sub-objects, validation groups)         │
│         │                                                      │
│         ▼                                                      │
│  ApplicationFlowType extends AbstractFlowType                  │
│         │ addStep('personal', PersonalStepType::class)         │
│         │ addStep('address',  AddressStepType::class) …        │
│         │ add('navigator',    NavigatorFlowType::class)        │
│         ▼                                                      │
│  ApplicationFlowController                                     │
│         │ $flow = $this->createForm(ApplicationFlowType::…)    │
│         │ $flow->handleRequest($request)                       │
│         │ return $this->render('application/flow.html.twig',   │
│         │   ['form' => $flow->getStepForm()])                  │
│         ▼                                                      │
│  templates/application/flow.html.twig                          │
│         │ {{ form(form) }}                                     │
│         ▼                                                      │
│  templates/form/shadcn_form_theme.html.twig                    │
│         │ emits <my-form>, <ui-field>, <ui-input>, …           │
│         │ flattens errors → json-errors='…'                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                                  │ HTML
                                  ▼
┌────────────────────────────────────────────────────────────────┐
│  Browser                                                       │
│                                                                │
│  assets/app.tsx                                                │
│      new App(({ is }) => registry[is] ?? null);                │
│                                                                │
│  registry maps:                                                │
│    "my-form"            → reactolith.Form                      │
│    "ui-input"           → ./components/ui/input.tsx            │
│    "ui-field-error"     → ./components/ui/field.tsx            │
│    "flow-progress"      → ./components/flow/progress.tsx       │
│    "flow-collection"    → ./components/flow/collection.tsx     │
│    …                                                           │
│                                                                │
│  reactolith hydrates the server HTML, intercepts form submits, │
│  morphs each response in place. Component state survives.      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## File map

```
symfony-multistep-form/
├── assets/
│   ├── app.tsx                            # reactolith mount + component registry
│   ├── app.css                            # Tailwind v4 + official shadcn tokens
│   ├── lib/utils.ts                       # shadcn's `cn(…)` helper
│   └── components/
│       ├── ui/                            # shadcn-style React primitives
│       │   ├── button.tsx
│       │   ├── checkbox.tsx
│       │   ├── checkbox-group.tsx
│       │   ├── color-picker.tsx
│       │   ├── field.tsx                  # FormItem / Label / Description / Error
│       │   ├── file-input.tsx
│       │   ├── input.tsx
│       │   ├── radio-group.tsx
│       │   ├── select.tsx
│       │   ├── slider.tsx
│       │   └── textarea.tsx
│       └── flow/                          # FormFlow-specific UI
│           ├── collection.tsx             # client-side add/remove rows
│           ├── navigator.tsx              # Back / Continue / Finish toolbar
│           └── progress.tsx               # step progress bar
├── bin/console
├── composer.json
├── config/
│   ├── bundles.php                        # FrameworkBundle, TwigBundle, PentatrionViteBundle
│   ├── packages/
│   │   ├── framework.yaml
│   │   ├── pentatrion_vite.yaml
│   │   ├── routing.yaml
│   │   ├── translation.yaml
│   │   ├── twig.yaml
│   │   └── validator.yaml
│   ├── routes.yaml
│   ├── routes/pentatrion_vite.yaml
│   └── services.yaml                      # registers ReactolithFormExtension
├── package.json                           # reactolith, react@19, react-dom@19, vite, tailwind
├── vite.config.js                         # @vitejs/plugin-react + @tailwindcss/vite + vite-plugin-symfony
├── tsconfig.json
├── public/
│   ├── build/                             # generated by `npm run build` (gitignored)
│   └── index.php
├── src/
│   ├── Controller/ApplicationFlowController.php
│   ├── Form/
│   │   ├── Flow/ApplicationFlowType.php   # extends AbstractFlowType
│   │   ├── SkillType.php                  # collection sub-form
│   │   └── Step/
│   │       ├── PersonalStepType.php
│   │       ├── AddressStepType.php
│   │       ├── EmploymentStepType.php
│   │       ├── PreferencesStepType.php
│   │       ├── DocumentsStepType.php
│   │       └── ConfirmStepType.php
│   ├── Kernel.php
│   ├── Model/                             # aggregate + sub-models, validation groups per step
│   │   ├── Application.php
│   │   ├── Address.php
│   │   ├── Documents.php
│   │   ├── Employment.php
│   │   ├── MembershipTier.php             # backed enum used by EnumType
│   │   ├── Personal.php
│   │   ├── Preferences.php
│   │   └── Skill.php
│   └── Twig/ReactolithFormExtension.php   # `reactolith_form_errors`, `reactolith_progress_steps`
├── templates/
│   ├── application/
│   │   ├── flow.html.twig                 # ONLY {{ form(form) }}
│   │   └── success.html.twig
│   ├── base.html.twig                     # vite_entry_link_tags / vite_entry_script_tags
│   └── form/shadcn_form_theme.html.twig   # ⭐ THE form theme
└── tests/
    ├── Controller/ApplicationFlowControllerTest.php
    ├── Form/
    │   ├── ApplicationFlowTypeTest.php
    │   ├── ApplicationFlowWalkthroughTest.php
    │   ├── PersonalStepTypeTest.php
    │   └── PreferencesStepTypeTest.php
    ├── FormTheme/
    │   ├── ShadcnFlowNavigatorTest.php
    │   ├── ShadcnFormThemeTest.php
    │   └── ShadcnFormThemeTestCase.php
    ├── Model/ApplicationTest.php
    └── bootstrap.php
```

---

## Drop this into your own project

1. **Install the dependencies.** Composer pulls in Symfony FormFlow + the Vite
   bundle, npm pulls in reactolith, React 19, Tailwind v4 with the official
   shadcn tokens:
   ```bash
   composer require pentatrion/vite-bundle
   npm install reactolith react react-dom
   npm install -D vite @vitejs/plugin-react vite-plugin-symfony tailwindcss @tailwindcss/vite tw-animate-css clsx tailwind-merge
   ```

2. **Copy** [`assets/app.css`](assets/app.css) (verbatim from the [official shadcn manual
   install](https://ui.shadcn.com/docs/installation/manual)) and [`vite.config.js`](vite.config.js).

3. **Copy** [`templates/form/shadcn_form_theme.html.twig`](templates/form/shadcn_form_theme.html.twig)
   and register it globally in `config/packages/twig.yaml`:
   ```yaml
   twig:
       form_themes:
           - 'form/shadcn_form_theme.html.twig'
   ```

4. **Copy** [`assets/components/ui`](assets/components/ui) and [`assets/components/flow`](assets/components/flow);
   adjust them to taste.

5. **Copy** [`src/Twig/ReactolithFormExtension.php`](src/Twig/ReactolithFormExtension.php) and register it as a Twig
   extension service. It exposes `reactolith_form_errors(form)` and
   `reactolith_progress_steps(form)` which the form theme uses to fill the
   `json-errors` and `json-steps` attributes.

6. **Wire up reactolith** in your entrypoint:
   ```tsx
   import { App, Form } from "reactolith";
   import { Input } from "./components/ui/input";
   // … the rest of the registry from assets/app.tsx

   new App(({ is }) => registry[is] ?? null);
   ```

Your Symfony views can now render any form with `{{ form(form) }}` and they'll
appear as reactolith-resolved React components, with state preserved across
every navigation and form submit.

---

## How the FormFlow is wired

The aggregate root is [`Application`](src/Model/Application.php). Each step
corresponds to one sub-object and one validation group:

```php
class Application
{
    public function __construct(
        #[Assert\Valid(groups: ['personal'])]
        public Personal $personal = new Personal(),

        #[Assert\Valid(groups: ['address'])]
        public Address $address = new Address(),
        // … 4 more …

        public string $currentStep = self::STEP_PERSONAL,
    ) {}
}
```

The flow type lists steps in order:

```php
final class ApplicationFlowType extends AbstractFlowType
{
    public function buildFormFlow(FormFlowBuilderInterface $builder, array $options): void
    {
        $builder
            ->addStep('personal',    PersonalStepType::class)
            ->addStep('address',     AddressStepType::class)
            ->addStep('employment',  EmploymentStepType::class)
            ->addStep('preferences', PreferencesStepType::class)
            ->addStep('documents',   DocumentsStepType::class)
            ->addStep('confirm',     ConfirmStepType::class)
            ->add('navigator',       NavigatorFlowType::class);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class'         => Application::class,
            'step_property_path' => 'currentStep',
            'data_storage'       => new SessionDataStorage('app.application_flow', $this->requestStack),
        ]);
    }
}
```

`FormFlowType` automatically sets `validation_groups` to
`['Default', <current_step>]`, so only the constraints belonging to the
current step run on every submission. Data between steps is persisted in the
session via `SessionDataStorage`.

The controller is barely three lines:

```php
public function __invoke(Request $request): Response
{
    $flow = $this->createForm(ApplicationFlowType::class, new Application());
    $flow->handleRequest($request);

    if ($flow->isSubmitted() && $flow->isValid() && $flow->isFinished()) {
        return $this->redirectToRoute('app_application_success');
    }

    return $this->render('application/flow.html.twig', [
        'form' => $flow->getStepForm(),
    ]);
}
```

---

## Chunk preloading

Because each `<ui-*>` / `<flow-*>` tag is resolved by `createLoader` lazily,
the browser only discovers which JS chunks the page needs **after** parsing
the document. The [reactolith preloading guide](https://reactolith.github.io/preloading/)
closes that gap by emitting `<link rel="modulepreload">` (and matching HTTP
`Link:` headers, so an HTTP/2 server can flush them as `103 Early Hints`).

This example ships a Symfony event subscriber that does exactly that at
runtime:

```
src/Preload/
├── PreloadLink.php                  # value object: URL + rel + as
├── VitePreloadLinkResolver.php      # tag → manifest entry → file + transitive imports + CSS
└── ReactolithPreloadSubscriber.php  # kernel.response → scan body, inject <link>, emit Link: headers
```

On every HTML response the subscriber:

1. Walks the response body once with a regex that picks up every hyphenated
   tag name (`<my-form>`, `<ui-input>`, `<flow-progress>` …).
2. Looks each tag up in Vite's `public/build/.vite/manifest.json` using the
   same fall-back rule as `createLoader` — `ui-radio-group-item` →
   `radio-group.tsx`.
3. Follows every entry's `imports` array transitively so shared chunks
   (`_chunk-…`, `_jsx-runtime-…`) and the entry chunk get preloaded too.
4. Adds each entry's `css` sidecar as `<link rel="preload" as="style">`.
5. Injects the `<link>` tags right after `<head>` so they're discoverable
   even by browsers that don't see HTTP/2 hints, **and** emits the same
   directives as `Link:` headers.

A typical first response to `/apply` carries roughly ten `<link rel="modulepreload">`
tags plus one CSS preload — one per visible component, the shared Vite
chunk, the shared `jsx-runtime` chunk, and the entry. The browser starts
fetching every chunk while still parsing the HTML body, eliminating the
component-discovery waterfall.

The mapping between loaders and source paths lives in
[`config/services.yaml`](config/services.yaml):

```yaml
App\Preload\VitePreloadLinkResolver:
    arguments:
        $manifestPath: '%kernel.project_dir%/public/build/.vite/manifest.json'
        $loaders:
            - { prefix: 'ui-',   path: 'assets/components/ui' }
            - { prefix: 'flow-', path: 'assets/components/flow' }
        $publicBuildPath: '/build/'
```

Add a new prefix here whenever you add another component family (e.g. an
`<icons-…>` set) and the resolver picks it up automatically.

## Troubleshooting

**`vite build` fails with “The project root contains the `#` character”.**
zsh on macOS doesn't enable `interactive_comments` by default, so pasting a
line like `npm run build # comment` passes the `#` as an extra argument to
Vite and Vite treats it as an entry name. Run the commands without inline
comments (the snippets in this README are already split that way) or enable
the option in `~/.zshrc`:

```zsh
setopt interactive_comments
```

---

## Caveats worth knowing

- **`<my-form>` is not a `<form>` until reactolith hydrates it.** Server-side
  it's a custom element, so non-JS form submissions don't work. WebTestCase
  tests POST directly to the route rather than using `$crawler->filter('my-form')->form(...)`
  for that reason. Disable CSRF in your `when@test:` block — the example
  ships with `csrf_protection: false` for the test env only.
- **Step names that shadow Application properties are fine** — Symfony routes
  submissions by step name and step names map straight onto Application
  properties. But a step name must **not** collide with a child field name
  inside its own form. That's why the `confirm` step's checkbox is named
  `accepted`, not `confirm`. Otherwise the flow's `isCurrentStepSubmitted()`
  check would misroute the POST.
- **Boolean and structured field values use the `json-` prefix.** Boolean
  attributes like `checked="true"` would arrive as the literal *string*
  `"true"`; reactolith uses `json-checked="true"` to mean the boolean.
  Same rule for `json-value='"de"'` (string) vs `json-value='["a","b"]'`
  (array). The form theme handles all of that.

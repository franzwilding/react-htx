# Symfony Multi-Step Form, the shadcn/ui way

A complete, working **Symfony 8** app that demonstrates the **`FormFlow`**
component (introduced in [Symfony 7.4](https://symfony.com/blog/new-in-symfony-7-4-multi-step-forms)
and rolled forward into the 8.x line) and a single **shadcn/ui form theme**
that handles every native Symfony form field type.

The view is just one line:

```twig
{# templates/application/flow.html.twig #}
{% form_theme form 'form/shadcn_form_theme.html.twig' %}
{{ form(form) }}
```

That's it. The form theme does the rest: label, control, description, errors,
ARIA wiring, spacing, button variants, and progress bar — all matching the
exact tokens and proportions shadcn/ui uses for its `<Form>` composition
(FormItem / FormLabel / FormControl / FormDescription / FormMessage).

---

## Why this example exists

Symfony's stock form theme is fine, but every team ends up writing the same
shim to make it look like a modern design system. This example is meant to be
**the reference implementation** for anyone who wants forms that look like
shadcn while keeping all of Symfony's superpowers — validation groups, data
mappers, transformers, type extensions, and the new `FormFlow` cursor.

Everything is centralized in
[`templates/form/shadcn_form_theme.html.twig`](templates/form/shadcn_form_theme.html.twig).
Copy that one file into your own Symfony project and you're done.

## What the form covers

The example splits a fictitious account-application flow into 6 steps. Across
the steps **every native Symfony form field type** is exercised at least
once:

| Step | Field types used |
| --- | --- |
| **Personal** | `TextType`, `EmailType`, `TelType`, `BirthdayType`, `ChoiceType` (expanded radios), `UrlType` |
| **Address** | `TextType`, `CountryType`, `LanguageType`, `LocaleType`, `TimezoneType` |
| **Employment** | `TextType`, `ChoiceType` (select), `MoneyType`, `CurrencyType`, `PercentType`, `IntegerType`, `RangeType`, `DateType`, `TimeType`, `DateTimeType`, `DateIntervalType`, `WeekType` |
| **Preferences** | `ChoiceType` (multi checkbox + expanded radio), `CheckboxType`, `ColorType`, `SearchType`, `PasswordType`, `RepeatedType`, `TextareaType`, `EnumType`, `HiddenType` |
| **Documents** | `FileType` (single + multiple), `CollectionType` (with prototype), `UuidType`, `UlidType` |
| **Confirm** | A standalone `CheckboxType` with an `IsTrue` constraint, plus the FormFlow navigator buttons (`PreviousFlowType`, `NextFlowType`, `FinishFlowType`) |

Every widget is rendered by a block in
[`shadcn_form_theme.html.twig`](templates/form/shadcn_form_theme.html.twig).

## Run it

Install the PHP and JS dependencies and build the Tailwind v4 + shadcn token
bundle once:

```bash
composer install
npm install
npm run build
```

Then start Symfony on the PHP built-in web server and open the form:

```bash
php -S 127.0.0.1:8000 -t public
open http://127.0.0.1:8000/apply
```

Requires PHP 8.2+, Composer, and Node 18+. The example uses the PHP built-in
web server so there's no dependency on `symfony/cli` — though `symfony serve`
works too.

For an HMR dev loop, run Vite alongside the PHP server. `pentatrion/vite-bundle`
switches between dev and built assets automatically based on `APP_ENV`:

```bash
npm run dev
```

The Vite dev server listens on `http://localhost:5173`; Symfony pulls the
asset URLs straight from it while `APP_ENV=dev`.

## Test it

The example is **fully TDD** with 57 PHPUnit tests / 164 assertions covering:

- **Widget rendering**: one test per field type, asserting the exact shadcn
  Tailwind classes, ARIA attributes, spacing wrappers, and structure
  ([`tests/FormTheme/ShadcnFormThemeTest.php`](tests/FormTheme/ShadcnFormThemeTest.php))
- **Flow wiring**: cursor ordering, navigator visibility per step,
  validation-group scoping ([`tests/Form/ApplicationFlowTypeTest.php`](tests/Form/ApplicationFlowTypeTest.php))
- **End-to-end walkthrough**: submit each step with valid data and assert the
  cursor advances; finally press Finish and assert the flow is marked
  `isFinished()` ([`tests/Form/ApplicationFlowWalkthroughTest.php`](tests/Form/ApplicationFlowWalkthroughTest.php))
- **HTTP integration**: boot the Symfony kernel, GET `/apply`, submit the
  first step, and assert the response markup
  ([`tests/Controller/ApplicationFlowControllerTest.php`](tests/Controller/ApplicationFlowControllerTest.php))

```bash
composer install
vendor/bin/phpunit
```

## File map

```
symfony-multistep-form/
├── assets/
│   ├── app.css                  # Tailwind v4 + verbatim shadcn globals.css
│   └── app.js                   # Vite entrypoint (CSS-only by default)
├── bin/console
├── composer.json
├── config/
│   ├── bundles.php
│   ├── packages/
│   │   ├── framework.yaml
│   │   ├── pentatrion_vite.yaml
│   │   ├── routing.yaml
│   │   ├── translation.yaml
│   │   ├── twig.yaml
│   │   └── validator.yaml
│   ├── routes.yaml
│   ├── routes/
│   │   └── pentatrion_vite.yaml
│   └── services.yaml
├── package.json                 # vite + tailwindcss v4 + vite-plugin-symfony + tw-animate-css
├── vite.config.js
├── public/
│   ├── build/                   # generated by `npm run build` (gitignored)
│   └── index.php
├── src/
│   ├── Controller/
│   │   └── ApplicationFlowController.php
│   ├── Form/
│   │   ├── Flow/ApplicationFlowType.php   # extends AbstractFlowType
│   │   ├── SkillType.php                  # collection-row sub-form
│   │   └── Step/
│   │       ├── PersonalStepType.php
│   │       ├── AddressStepType.php
│   │       ├── EmploymentStepType.php
│   │       ├── PreferencesStepType.php
│   │       ├── DocumentsStepType.php
│   │       └── ConfirmStepType.php
│   ├── Kernel.php
│   └── Model/
│       ├── Application.php       # aggregate root; validation groups = step names
│       ├── Address.php
│       ├── Documents.php
│       ├── Employment.php
│       ├── MembershipTier.php    # backed enum used by EnumType
│       ├── Personal.php
│       ├── Preferences.php
│       └── Skill.php
├── templates/
│   ├── application/
│   │   ├── flow.html.twig        # ONLY calls {{ form(form) }}
│   │   └── success.html.twig
│   ├── base.html.twig            # vite_entry_link_tags / vite_entry_script_tags
│   └── form/
│       └── shadcn_form_theme.html.twig   # ⭐ THE form theme
└── tests/
    ├── Controller/ApplicationFlowControllerTest.php
    ├── Form/ApplicationFlowTypeTest.php
    ├── Form/ApplicationFlowWalkthroughTest.php
    ├── Form/PersonalStepTypeTest.php
    ├── Form/PreferencesStepTypeTest.php
    ├── FormTheme/ShadcnFlowNavigatorTest.php
    ├── FormTheme/ShadcnFormThemeTest.php
    ├── FormTheme/ShadcnFormThemeTestCase.php
    ├── Model/ApplicationTest.php
    └── bootstrap.php
```

## Drop the form theme into your own project

1. Make sure you have Tailwind v4 and the shadcn tokens. The example follows
   the [official shadcn manual install](https://ui.shadcn.com/docs/installation/manual):

   ```bash
   composer require pentatrion/vite-bundle
   npm install -D vite vite-plugin-symfony tailwindcss @tailwindcss/vite tw-animate-css
   ```

   `vite.config.js` only needs the Symfony plugin and Tailwind plugin:
   ```js
   import { defineConfig } from "vite";
   import symfonyPlugin from "vite-plugin-symfony";
   import tailwindcss from "@tailwindcss/vite";

   export default defineConfig({
       plugins: [tailwindcss(), symfonyPlugin()],
       build: { rollupOptions: { input: { app: "./assets/app.js" } } },
   });
   ```

   Copy [`assets/app.css`](assets/app.css) — that file is the verbatim
   [shadcn globals.css](https://ui.shadcn.com/docs/installation/manual)
   with two extra `@source` lines telling Tailwind to scan your Twig
   templates and PHP sources.

2. Copy
   [`templates/form/shadcn_form_theme.html.twig`](templates/form/shadcn_form_theme.html.twig)
   into your project's `templates/form/` directory.

3. Register it globally in `config/packages/twig.yaml`:
   ```yaml
   twig:
       form_themes:
           - 'form/shadcn_form_theme.html.twig'
   ```

4. Wire the entrypoint into your base layout:
   ```twig
   {{ vite_entry_link_tags('app') }}
   {{ vite_entry_script_tags('app') }}
   ```

That's the whole integration. Your views can render any form with
`{{ form(form) }}` and it will come out looking like a shadcn form.

## How the FormFlow is wired

The aggregate root is [`Application`](src/Model/Application.php). Each step
in the flow corresponds to one sub-object on the aggregate and one validation
group:

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

The flow type just lists the steps in order:

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

The controller is barely more than three lines:

```php
public function __invoke(Request $request): Response
{
    $flow = $this->createForm(ApplicationFlowType::class, new Application());
    $flow->handleRequest($request);

    if ($flow->isSubmitted() && $flow->isValid() && $flow->isFinished()) {
        // persist / queue / email …
        return $this->redirectToRoute('app_application_success');
    }

    return $this->render('application/flow.html.twig', [
        'form' => $flow->getStepForm(),
    ]);
}
```

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

## Caveats worth knowing

- **Step names that shadow Application properties are fine** — Symfony routes
  submissions by step name, and step names map straight onto Application
  properties. But a step name must **not** collide with a child field name
  inside its own form. That's why the `confirm` step's checkbox is named
  `accepted`, not `confirm`. The form theme works fine either way, but the
  flow's `isCurrentStepSubmitted()` check would otherwise misroute the POST.
- **`UrlType` renders as `<input type="text" inputmode="url">` in Symfony 7.4+**
  — the theme handles either, but worth knowing if you write your own
  selector-based tests.
- **`DateIntervalType` cannot enable `with_weeks` and `with_days`
  simultaneously** — the example shows months + days + hours, which is the
  most common notice-period shape.

Have fun. PRs that add fields or polish the theme are welcome.

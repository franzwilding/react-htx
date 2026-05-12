# Examples

End-to-end example apps that show reactolith and related server-side patterns
in real frameworks.

| Example | What it demonstrates |
| --- | --- |
| [`symfony-multistep-form`](./symfony-multistep-form) | A full Symfony 7.4 multi-step form built with the native `FormFlow` component, rendered through a **shadcn/ui form theme** that covers every native Symfony form field type. Every field — text, date, range, money, file, collection, ULID, enum, … — is styled by a single `shadcn_form_theme.html.twig` so views only need `{{ form(form) }}`. |

Each example is a self-contained app with its own `composer.json` /
`package.json`, dependencies, README, and test suite. They are not part of the
reactolith npm package — clone, `composer install` / `npm install`, and run.

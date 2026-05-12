// Vite entrypoint for the Symfony multi-step form example.
//
// The CSS import below pulls in Tailwind v4 plus the official shadcn/ui
// `globals.css` (with the OKLCH tokens, @theme inline mapping, and @layer
// base reset). Tailwind v4 scans `templates/**/*.html.twig` and `src/**/*.php`
// for utility classes — see the `@source` lines at the top of app.css.
//
// The example deliberately ships no client-side JavaScript: every behaviour
// in the form (next/previous, file inputs, the collection prototype) is
// already wired up by Symfony's server-rendered FormFlow. Add a Stimulus
// controller here when you need to enhance things like an in-place
// "Add another skill" affordance.
import "./app.css";

# Contributing to reactolith

Thanks for your interest in contributing! This guide covers the essentials so
you can get a change merged without having to dig through the codebase first.

## Getting set up

```bash
git clone https://github.com/reactolith/reactolith.git
cd reactolith
npm install
```

**Node 22.22.2+** is required to run the local checks (jsdom 30 declares
`^22.22.2 || ^24.15.0 || >=26`, and `@testing-library/jest-dom` 7 wants
`>=22`); CI runs Node 22. That is a *development* requirement — the published
package still targets Node 18 in `engines`, which is what consumers need. All
commands below run from the repository root unless noted otherwise.

## Local checks

The same three commands CI runs:

```bash
npm test           # vitest run (unit + integration tests)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint src tests
```

Useful extras:

```bash
npm run test:watch     # rerun tests on file changes
npm run test:coverage  # vitest with v8 coverage report
npm run lint:fix       # auto-fix lint findings where possible
npm run format         # prettier --write src/ tests/
npm run build          # produce dist/ — not required for PRs, but handy
```

Please make sure `npm test`, `npm run typecheck`, and `npm run lint` all pass
before opening a PR.

## Docs site

The documentation site under [`docs/`](./docs) is itself a reactolith app
(every page is plain HTML hydrated into React) and is built with Vite:

```bash
cd docs
npm install
npm run dev      # local preview at http://localhost:5173
npm run build    # production build into docs/dist
```

The deployed site lives at <https://reactolith.github.io/> and is mirrored
from `docs/` into the [`reactolith/reactolith.github.io`](https://github.com/reactolith/reactolith.github.io)
repository on every push to `main` by the workflow in
[`.github/workflows/sync-docs.yml`](./.github/workflows/sync-docs.yml). If your
change touches public API or user-visible behavior, please update the relevant
page under `docs/<topic>/index.html` in the same PR.

## Branches and commits

- Open PRs against `main`.
- One topic per PR — keep diffs focused and reviewable.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`,
  `chore:`, `test:`, `refactor:`). The recent `git log` is a good reference.
- If your PR closes an issue, mention it in the description (`Closes #123`)
  so it's auto-closed on merge.

## Releases

Releases are author-managed. Maintainers cut a new version with `npm version`,
push the tag, and the [`release.yml`](./.github/workflows/release.yml) workflow
publishes the package to npm. Published tarballs carry an
[npm provenance](https://docs.npmjs.com/generating-provenance-statements)
attestation linking them back to the GitHub Actions run that built them.
Contributors do **not** need to bump the version or edit a changelog as part of
a PR.

## Reporting bugs / proposing features

- Bugs: open an issue with a minimal reproduction (a failing test is ideal).
- Features: open an issue first to discuss the shape of the API before
  writing code — saves rewrites if the design needs changes.

Thanks again — every contribution helps!

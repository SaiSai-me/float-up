# Contributing to Float Up

Thanks for helping improve Float Up.

## Before you begin

- Search existing issues before opening a new one.
- Keep pull requests focused on one behavior or documentation topic.
- Do not add mobile layout work to v1 without an agreed issue.
- Do not add personal, trademarked, scraped, or ambiguously licensed sample imagery.
- User images must remain browser-local. Features that introduce upload servers, analytics, or persistence need explicit discussion first.

## Local checks

```bash
npm install
npm run typecheck
npm run build
```

Both commands must succeed before a pull request is ready. Please describe the browser and desktop viewport you used for your own visual review; automated screenshots are not required.

## Code organization

- Reusable runtime behavior belongs in `src/float-up/`.
- Playground-only upload, editing, and export behavior belongs in `src/playground/`.
- Keep the `float-up-` CSS prefix in the reusable component.
- Preserve the public `FloatUpConfig` version unless a documented migration is included.

## Pull requests

Explain what changed, why it belongs in Float Up, and whether the public configuration format changes. By contributing, you agree that your contribution is licensed under the repository's MIT License.

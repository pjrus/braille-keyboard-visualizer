# Contributing

Thanks for helping improve the Braille Keyboard Visualiser.

## Getting started

Use Node.js 20.9 or newer. Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Making changes

- Check the existing code and documentation before adding a new pattern or dependency.
- Keep changes focused and follow the current module boundaries.
- Write interface copy, documentation and comments in Australian English where practical.
- Keep the interface visually flat, using solid colours, clear borders and spacing.
- Keep browser APIs and Three.js code within the client-side scene flow. Dispose of scene resources when the scene unmounts; do not force WebGL context loss.
- When changing persisted settings, update their validation and persistence in `src/lib/visualiser-settings.ts`.

For larger changes, open or find an issue first and describe the behaviour or outcome you intend to change.

## Checks

Before opening a pull request, run:

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build
```

Run `npm run format` to fix formatting.

Include the checks you ran in the pull request description. If a check cannot be run, say why.

## Pull requests

Open a focused pull request against `main`. Include a short summary, link the related issue (use `Fixes #number` when the pull request should close it), and list validation results. Include screenshots for interface or 3D layout changes.

### Pull request template

This repository does not currently have a GitHub pull request template. A small `.github/pull_request_template.md` with prompts for **Summary**, **Related issue**, **Checks**, and optional **Screenshots** would make the guidance above easier to follow. Add one if the team wants those prompts on every pull request; until then, include the details in the pull request description.

# Implemented Summaries

Store concise post-implementation summaries linked to source plans.

## Validation Reference

For implementation plans that require full validation evidence before closure, run the frontend validation stack in order:

```bash
npm run typecheck          # TypeScript — zero errors required
npm run test               # Vitest unit + component tests
npx playwright test --project=mobile   # Runtime validation — mobile viewport first
npx playwright test --project=desktop  # Runtime validation — desktop
```

All four commands must pass before a plan can be summarized and archived. See `architecture/34_runtime_validation.md` for the complete runtime validation protocol and completion checklist.

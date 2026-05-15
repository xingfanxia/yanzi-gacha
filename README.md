# Yanzi Gacha

Next.js migration of the Memoria wireframe and frequency-battle demo.

## Routes

- `/spec/wireframe` - migrated `spec/wireframe.html` prototype; screen 24 embeds the battle experience as the frequency tab.
- `/battle` - standalone migrated `battle/index.html` demo for direct battle testing.
- `/` and `/spec` redirect to `/spec/wireframe`.

## Commands

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

## Structure

- `app/` - Next.js App Router pages and global layout.
- `src/features/wireframe/` - wireframe markup, styles, and interaction adapter.
- `src/features/battle/` - battle React experience, extracted styles, and rule model.
- `public/img/` and `public/spec/assets/` - static assets copied from the original prototype paths for Next routing.
- `tests/` - parity tests for core wireframe navigation and battle rules/flow.
- `scripts/testing/verify-next-routes.py` - Playwright smoke check for built routes.

# 04 — Web App (parallel; buildable against mock data, final wiring needs 02-nutrition)

Covers your original **Step 5**: a static app that generates a weekly menu, allows swapping, adding items, and manual sync.

## Prerequisites
- Read `plan/SCHEMA.md`.
- Can start immediately with a small **mock `menu-data.json`** that conforms to `SCHEMA.md`; replace with the real file when ready.

## Stack & storage (settled)
- **Plain static HTML/CSS/JS**, no build step. Runnable via any static server or `file://` (note: `fetch` of local JSON may need a tiny static server, e.g. `python3 -m http.server`).
- **`localStorage`** for the user's current week, saved menus, and newly added items.
- App **reads** `data/menu-data.json`; it does **not** call USDA directly.

## Outputs
- `index.html` (at repo root) reading `web/menu-data.js`.
- Generator + constraint logic in `app.js`.
- Wiring so "Add item" appends to an in-app list persisted to `localStorage`, exportable to `data/pending-items.json`.

## Features
1. **Generate weekly menu (7 days × breakfast/lunch/dinner).**
   The generator is a **weighted constraint picker**, not pure random:
   - **Protein ≥ 70 g/day (hard constraint):** after picking 3 meals, sum protein; if < 70, auto-add Fairlife shake (30 g) then yogurt (15 g) until ≥ 70. Display top-ups distinctly.
   - **Variety (anti-fatigue):** no repeat of the same item within the week (configurable N days); weight toward less-recently-used items; optional cuisine rotation.
   - **Ingredient reuse:** bias selection toward items sharing ingredients already chosen that week; expose a per-week **shared-ingredient shopping list**.
   - **Restaurant spacing:** never place two `eat-out` items on consecutive days.
   - **Lunch simplicity:** prefer `simple-lunch`/`quick` items for lunch; keep `advance-prep` out of lunch unless prepped.
   - **Advance prep:** flag `advance-prep` items (e.g., Idli & Sambar) with a prep-ahead reminder; don't stack them without lead time.
   - Protein target is **personal only** (not per family member).
2. **Swap a single slot:** re-roll one breakfast/lunch/dinner without regenerating the week; swap must re-check the day's 70 g protein and adjust top-ups.
3. **Add new item:** form → validates against `SCHEMA.md` shape → stored in `localStorage` and shown as "pending"; provide an **Export pending → `data/pending-items.json`** action.
4. **Manual sync trigger (documented, not automatic):** README instructs running `node scripts/sync.mjs` to enrich `pending-items.json` via USDA and merge into `menu-data.json`; app picks up new items on reload.
5. **Weekly shopping list:** aggregate ingredients across the generated week, grouped so shared ingredients are bought once.

## Acceptance criteria
- Every generated day shows ≥ 70 g protein (with visible supplement top-ups when needed).
- Individual breakfast/lunch/dinner swap works and re-balances protein.
- New items persist across reloads and can be exported to `pending-items.json`.
- Shopping list groups shared ingredients.
- No secrets/API keys in any web file.

## Do NOT
- Do not call the USDA API from the browser.
- Do not require a build toolchain (keep it buildless static).
- Do not change ingredient naming conventions (owned by foundation/SCHEMA).

## Handoff / integration
Replace mock `menu-data.json` with the real one from `01-foundation` + `02-nutrition`. Confirm the generator's protein math uses real numbers.

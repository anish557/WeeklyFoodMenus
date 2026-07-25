# 02 — Nutrition (parallel; depends on 01-foundation)

Covers your original **Step 3**: map estimated nutrition to every item using **USDA FoodData Central (FDC)**.

## Prerequisites
- Read `plan/SCHEMA.md`.
- `data/menu-data.json` exists with items + canonical ingredients (from 01-foundation).
- A free USDA FDC API key: https://fdc.nal.usda.gov/api-key-signup.html

## Security
- Store the key in an **untracked** file: `config.local.json` → `{ "USDA_FDC_KEY": "..." }` (add to `.gitignore`).
- Perform lookups only in `scripts/sync.mjs` (Node). Never embed the key in the web app or committed files.

## Outputs
- Updated `data/menu-data.json` with filled `nutrition` for every item.
- `docs/nutrition.md` — human-readable table (item, serving, protein_g, calories, source, confidence).
- `scripts/sync.mjs` — reusable script (also used later for user-added items).

## Steps
1. **Write `scripts/sync.mjs`** (Node, uses global `fetch`):
   - Load key from `config.local.json`.
   - For each item with `nutrition.source === "pending"`, query FDC (`/v1/foods/search`) by dish name and/or per-ingredient, pick best match, read the `Protein` and `Energy (kcal)` nutrients.
   - Scale to the item's `serving`.
   - Write `protein_g`, `calories`, optional `carbs_g`/`fat_g`, `source: "usda-fdc"`, `confidence`, `fdcId`.
   - If no confident match, fall back to `source: "ai-estimate"`, `confidence: "low"` with a clearly flagged estimate.
2. **Run it** against `menu-data.json`; verify JSON stays valid and every item now has numeric `protein_g` + `calories`.
3. **Generate `docs/nutrition.md`** as a readable table sorted by slot, showing confidence/source so low-confidence rows are easy to verify.
4. **Sanity check** protein values against portion sizes (e.g., a chicken plate shouldn't read 4 g).

## Acceptance criteria
- Every catalog item has numeric `protein_g` and `calories`.
- Each item records `source`, `confidence`, and `fdcId` (or null).
- `scripts/sync.mjs` can be re-run on `pending-items.json` later without changes.

## Do NOT
- Do not hardcode the API key.
- Do not change item `id`s, `slots`, or ingredient names (owned by foundation).

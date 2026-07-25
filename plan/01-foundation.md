# 01 — Foundation (RUN FIRST, single session)

Covers your original **Step 1 (extract)** and **Step 2 (inventory + categorize)**, and produces the `menu-data.json` skeleton that unblocks all parallel tracks.

## Prerequisites
- Read `plan/SCHEMA.md` fully.
- Source menu **images are present in the workspace** (ask the user for the folder if missing; do not invent data).

## Inputs
- Menu images (photos/screenshots of meals, menus, or lists).

## Outputs
- `docs/rawData.md` — verbatim extracted text.
- `docs/data.md` — inventoried + categorized items (human-readable).
- `data/menu-data.json` — catalog skeleton conforming to `SCHEMA.md`, **nutrition left pending**.
- `data/pending-items.json` — initialized empty (`{ "items": [] }`).

## Steps
1. **Extract (Step 1).** For each image, transcribe ALL visible text verbatim into `docs/rawData.md`. Group under a heading per image (filename). Do not clean up or interpret yet — capture raw. If text is ambiguous/unreadable, mark `[unclear]` rather than guessing.
2. **Inventory + categorize (Step 2).** In `docs/data.md`:
   - Deduplicate items that appear multiple times.
   - Assign each item to meal slot(s): breakfast / lunch / dinner (allow multiple).
   - Tag cuisine and obvious tags (vegetarian, quick, leftover-friendly).
   - List ingredients per item using **canonical lowercase names** (this is critical for later ingredient-reuse detection — normalize `Onions`, `onion, diced` → `onion`).
3. **Build the skeleton `menu-data.json`.** Convert `data.md` into JSON per `SCHEMA.md`. Include the two supplements block exactly as in the schema. Leave each item's `nutrition` as:
   ```json
   { "protein_g": null, "calories": null, "source": "pending", "confidence": "low", "fdcId": null }
   ```
4. **Initialize** `data/pending-items.json` as `{ "items": [] }`.
5. **Validate** `menu-data.json` is valid JSON and every item has `id`, non-empty `slots`, `serving`, and `ingredients`.

## Acceptance criteria
- Every image's text is captured in `rawData.md`.
- Every distinct meal item exists in `menu-data.json` with slot(s) + canonical ingredients.
- Ingredient names are normalized/lowercase and reused consistently across items.
- No nutrition numbers invented here (that's the nutrition track).

## Do NOT
- Do not estimate nutrition here.
- Do not build any UI here.
- Do not rename/renumber ids later — downstream tracks depend on them being stable.

## Handoff
When done, tracks `02-nutrition`, `03-food-report`, and `04-webapp` can start in parallel.

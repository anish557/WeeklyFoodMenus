# 03 — Food Report (parallel; depends on 01-foundation)

Covers your original **Step 4**: analyze the meal ideas and report on what's eaten at breakfast / lunch / dinner.

## Prerequisites
- Read `plan/SCHEMA.md`.
- `data/menu-data.json` exists with items, slots, cuisine, tags, ingredients (from 01-foundation).
- Nutrition is NOT required here (can run before/alongside 02-nutrition). If nutrition is present, include it; if not, omit macro commentary.

## Output
- `docs/food-report.md` — a readable report.

## What to include
1. **Per-slot breakdown** (breakfast / lunch / dinner):
   - Count of options, cuisines represented, common tags.
   - Recurring themes (e.g., "breakfasts skew egg + yogurt based").
2. **Ingredient reuse analysis** (directly serves the anti-waste goal):
   - Most-shared ingredients across items (candidates to buy once, use many times).
   - Items that are "ingredient islands" (unique ingredients → more waste risk).
3. **Variety assessment (anti-fatigue):**
   - Where is variety thin? (e.g., only 2 dinner options → fatigue risk).
   - Suggested gaps to fill to keep weekly planning interesting.
4. **Protein outlook** (if nutrition available):
   - Which slots are protein-strong vs protein-weak, and how often the 30g shake / 15g yogurt top-ups would be needed.

## Acceptance criteria
- Report is grounded ONLY in `menu-data.json` (no invented items).
- Includes a shared-ingredient table and a concrete list of variety gaps to address.

## Do NOT
- Do not modify `menu-data.json`.
- Do not build UI.

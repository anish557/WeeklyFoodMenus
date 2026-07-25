# SCHEMA.md — Shared Data Contract (read in EVERY session)

This is the single contract all parallel work must conform to. Do not diverge from it without updating this file first.

## `data/menu-data.json` (canonical catalog)
```jsonc
{
  "version": 1,
  "generatedAt": "ISO-8601 timestamp",
  "supplements": [
    { "id": "supp-fairlife", "name": "Fairlife Protein Shake", "protein_g": 30, "calories": 150, "always_available": true },
    { "id": "supp-greek-yogurt", "name": "Greek Yogurt Cup", "protein_g": 15, "calories": 100, "always_available": true }
  ],
  "items": [
    {
      "id": "kebab-case-unique-id",
      "name": "Human readable name",
      "slots": ["breakfast" | "lunch" | "dinner"],   // one or more
      "cuisine": "e.g. Indian | Mexican | American | ...",  // optional, for variety rotation
      "tags": ["vegetarian", "quick", "leftover-friendly"], // optional freeform
      "serving": { "amount": 1, "unit": "plate|bowl|cup|piece|g" },
      "ingredients": [
        { "name": "canonical ingredient name (lowercase)", "quantity": "optional freeform e.g. 200 g" }
      ],
      "nutrition": {
        "protein_g": 0,
        "calories": 0,
        "carbs_g": 0,     // optional
        "fat_g": 0,       // optional
        "source": "usda-fdc | ai-estimate | manual",
        "confidence": "high | medium | low",
        "fdcId": null      // USDA FoodData Central id if matched
      }
    }
  ]
}
```

### Rules
- `id` is unique, kebab-case, stable (never renumber existing ids).
- `slots` MUST be a non-empty array. An item valid for lunch or dinner => `["lunch","dinner"]`.
- `ingredients[].name` is **canonical + lowercase** so the app can detect shared ingredients across items (e.g. always `"onion"`, never `"Onions"`/`"onion, diced"`).
- `nutrition.protein_g` and `calories` are required once nutrition is filled; `carbs_g`/`fat_g` optional.
- Foundation step may leave nutrition as `{ "protein_g": null, "calories": null, "source": "pending", "confidence": "low", "fdcId": null }`. Nutrition step fills them.

### Reserved tags (the generator interprets these)
Tags are otherwise freeform, but these carry behavior:
- `eat-out` / `backup` — restaurant meals. Generator MUST NOT place two `eat-out` items on consecutive days.
- `advance-prep` — needs multi-day lead time (e.g. Idli & Sambar batter proofs ~2 days). Generator surfaces a prep-ahead reminder and must not double-book these without lead time.
- `simple-lunch` — quick to assemble; generator prefers these (and `quick`) for the lunch slot.
- `salad` — salad-based; only a full meal when it includes a protein ingredient.
- `high-protein` — hint for hitting the 70 g/day personal target.

## `data/pending-items.json` (staging for user-added items)
```jsonc
{
  "items": [
    {
      "id": "kebab-case-unique-id",
      "name": "...",
      "slots": ["lunch"],
      "ingredients": [ { "name": "chicken breast" } ],
      "serving": { "amount": 1, "unit": "plate" },
      "status": "pending"   // pending -> synced (moved into menu-data.json by scripts/sync.mjs)
    }
  ]
}
```

### Sync contract (`scripts/sync.mjs`)
1. Read `pending-items.json`.
2. For each `pending` item, query USDA FDC for each ingredient / the dish; estimate `protein_g` + `calories`.
3. Set `nutrition.source = "usda-fdc"`, `confidence`, and `fdcId` when matched.
4. Append the enriched item into `menu-data.json` `items`, mark the pending item `synced`.
5. Never overwrite an existing `menu-data.json` id; if a collision occurs, suffix the new id.

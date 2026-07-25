# Weekly Food Menus — Master Plan & Overview

## The real goal (read this first)
Avoid **weekly meal-planning fatigue** by generating **interesting, varied** weekly menus that:
1. Guarantee **≥ 70 g protein per day** (using meals + on-hand supplements). *Personal target only — other family members have no strict requirement.*
2. Prefer **shared ingredients across the week** to reduce waste/shopping load.
3. Keep it **fresh** — controlled variety, not the same meals every week.

On-hand protein supplements (always available, used to top-up a short day):
- **Fairlife shake** — 30 g protein each.
- **Greek yogurt cup** — 15 g protein each.

## Core design decisions (settled)
- **Canonical data = `data/menu-data.json`** (machine-readable, single source of truth).
  Markdown files (`rawData.md`, `data.md`, `nutrition.md`, `food-report.md`) are **human-readable views**, not the source of truth.
- **Web app = plain static HTML/CSS/JS** (no build step, opens in a browser).
- **Storage = browser `localStorage`** for the user's saved/generated menus + newly added items; the app reads the static `data/menu-data.json` for the catalog.
- **Nutrition source = USDA FoodData Central (FDC) API**, called only from a **local Node script** (never the browser).
- **Generator is NOT pure random.** It is a **weighted, constraint-satisfying picker** (see below).

## Security guardrails (apply everywhere)
- USDA FDC API key lives in an **untracked** `.env` / `config.local.json` (add to `.gitignore`). Never hardcode it in committed files and never ship it to the browser.
- All USDA lookups run in a local script (`scripts/sync.mjs`), producing JSON the static app consumes.

## The generator, refined (why "random" alone fails the goal)
Pure randomness fights all three goals. Replace it with a picker that:
- **Enforces protein:** sum protein for breakfast + lunch + dinner; if a day < 70 g, auto-add a Fairlife shake (30 g) and/or yogurt (15 g) until it clears 70 g. Show the top-ups explicitly.
- **Optimizes ingredient reuse:** score candidate weeks by count of shared ingredients; prefer picks that reuse ingredients already selected that week. Emit a consolidated shopping list grouped by shared ingredients.
- **Controls variety (anti-fatigue):** no repeat of the same item within N days; weight toward under-used items; optional cuisine rotation.
- **Respects flexible slots:** an item may be valid for multiple meal slots (e.g., `["lunch","dinner"]`).
- **Spaces out restaurants:** never schedule two `eat-out` items on consecutive days.
- **Keeps lunches simple:** prefer `simple-lunch`/`quick` items for the lunch slot; avoid `advance-prep` items at lunch unless already prepped.
- **Honors advance prep:** `advance-prep` items (e.g., Idli & Sambar ~2-day batter proof) trigger a prep-ahead reminder and aren't stacked without lead time.

## Parallelization map
| Order | Plan file | Depends on | Can run in parallel with |
|------|-----------|-----------|--------------------------|
| 1 (first) | `01-foundation.md` | `SCHEMA.md`, images | — |
| 2 | `02-nutrition.md` | foundation output | 03, 04 |
| 2 | `03-food-report.md` | foundation output | 02, 04 |
| 2 | `04-webapp.md` | `SCHEMA.md` (mock data ok) | 02, 03 |

- **`SCHEMA.md` is the shared contract.** Every parallel session reads it so their outputs fit together without conflicts.
- **04-webapp** can be built immediately against a small mock dataset that conforms to `SCHEMA.md`; swap in real `menu-data.json` once 02-nutrition finishes.

## Suggested repo layout
```
plan/                 # these planning docs
data/
  menu-data.json      # canonical catalog (built by foundation + nutrition)
  pending-items.json  # staging area for user-added items awaiting sync
docs/
  rawData.md          # step 1 output
  data.md             # step 2 output
  nutrition.md        # step 3 human-readable view
  food-report.md      # step 4 report
scripts/
  sync.mjs            # USDA lookup + merge pending -> menu-data.json
web/                  # static app (index.html, app.js, styles.css)
.env / config.local.json  # USDA key (gitignored)
```

## Definition of done (whole project)
- `menu-data.json` has every item with slot(s), ingredients, serving size, and protein/calories (+ confidence/source).
- The app generates a 7-day menu that always meets ≥70 g protein/day, lets me swap any breakfast/lunch/dinner, add new items to `pending-items.json`, and shows a shared-ingredient shopping list.
- A documented, manual `sync` step enriches new items via USDA and promotes them into `menu-data.json`.

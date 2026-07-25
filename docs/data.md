# data.md — Inventory & Categorization

> Derived from `docs/rawData.md`. This is the human-readable view; the canonical machine data is `data/menu-data.json`.
> **87 meal items** catalogued across breakfast / lunch / dinner. Snacks, kid activities, shopping lists, and events are separated out below (not part of the generator catalog).

## How OCR was normalized
The sheet is a **Gujarati/Indian-American family plan**. Common corrections applied:

| Raw OCR | Normalized |
|--------|-----------|
| Rajna | Rajma (kidney beans) |
| Chanadal | Chana dal |
| rotli | roti |
| coca powder | cocoa powder |
| Bataka | potato |
| Kitchdi | Khichdi |
| Pulha | Pulao |
| Mumra / Mamra | puffed rice |
| Makana | Makhana (fox nuts) |
| vagareli / vaghareli | tempered (tadka) |
| Belange | Bolognese |
| Binda Kadhi | Bhinda Kadhi (okra) |
| Bando (in smoothie) | protein powder |
| Din Ti / Din Ti Fung | Din Tai Fung |

Low-confidence / undecipherable raw fragments left out of the catalog: `pag`, `lali Sambar`, `Erano`, `Barthol`, `Dambor bread`, `Kke`. Flag these if you recognize them.

**Resolved by user:** `Sing tong` → Sing Tong Thai (nearby Thai restaurant, eat-out backup); `puda` → Puda (savory spiced veggie pancakes); `Idli+Sambar` confirmed (needs ~2-day batter prep).

## Breakfast (23)
| Item | Cuisine | Notes |
|------|---------|-------|
| Yogurt & Fruit | American | high-protein, recurring staple |
| Cottage Cheese Bowl | American | high-protein |
| Avocado Toast & Fruit | American | also "Guac + fruit" |
| Almond Butter Toast & Fruit | American | |
| Buttered Toast & Fruit | American | |
| Yogurt & Bread | American | high-protein |
| Boiled Eggs | American | high-protein, very frequent |
| Spiced Boiled Eggs | Indian | "tossed in spices" |
| Boiled Egg & Yogurt | American | high-protein |
| Boiled Egg & Waffle | American | |
| Scrambled Eggs | American | high-protein |
| Scrambled Eggs with Cheese | American | high-protein |
| Omelette | American | |
| Indian Egg Scramble (Akoori) | Indian | |
| Indian Omelette with Cottage Cheese | Indian | high-protein |
| Pizza Egg with Tomato | American | |
| Savory Broccoli Cheddar Waffles with Eggs | American | |
| Dhokla (Vaghareli) | Indian | steamed |
| Bataka Poha | Indian | |
| Oat Bar & Fruit | American | make-ahead |
| Chocolate Chia Pudding | American | recipe on sheet, make-ahead |
| Mango Protein Smoothie | American | recipe on sheet, high-protein |
| Puda (Savory Veggie Pancakes) | Indian | gram-flour based, high-protein; also a simple lunch |

## Lunch (lunch-only: 4)
Sandwich · Vegetable Soup · Mini Idli · Vaghareli Idli
> The sheet's lunches are heavily **"leftovers"** (from the prior dinner). The generator should treat some dinners as leftover-friendly lunches (see shared items below).

## Lunch or Dinner (interchangeable: 18)
Panini Sandwich · Mexican Soup · Chickpea Pasta Salad · Lentil Salad · Quesadilla (Beans/Chicken) · Cream Cheese Rolls with Veggies · Rajma & Rice · Chana Dal with Roti · Rice & Dal · Idli & Sambar *(advance-prep: ~2-day batter)* · Quinoa & Broccoli · Mexican Rice Bowl · Shawarma · Falafel · Asian Stir Fry Noodles · Rice Bowl · Greek Salad w/ Chicken or Chickpeas · Coleslaw Bowl w/ Grilled Chicken

## Dinner (dinner-only: 42)
**Indian:** Khichdi · Bhinda Kadhi · Bataka/Eggplant Sabzi · Moong Beans Sabzi · Thick Bhakri w/ Cottage Cheese · Shahi/Butter Paneer w/ Roti · Paneer Burger · Pav Bhaji · BBQ Hara Bhara Kebab · Vegetable Pulao · Chicken Biryani · Chicken Curry w/ Naan & Rice · Butter Chicken Bake · Egg Curry · Pani Puri · Maharaja Thali (eat-out)
**Italian:** Pizza · Pan Pizza · Pasta · Pasta Bake · Pasta Bolognese · Garlic Parmesan Chicken Pasta · Green Goddess Pasta · Risotto
**American:** Chicken Bake · Chicken & Broccoli Nuggets · Burgers & Fries · Burgers & Poutine · Cheesy Rice w/ Veggies · Cheesy Broccoli · Butter Garlic Veggies · Potato & Quinoa · Rice-a-Roni
**Mexican:** Tacos · Nachos · Cauliflower Enchilada
**Mediterranean/Middle Eastern:** Greek Meal · Grilled Zucchini
**Asian:** Pad Thai · Tofu Bowl w/ Chili Paneer · Din Tai Fung (eat-out) · Sing Tong Thai (eat-out backup)

## Cuisine distribution (catalog)
Indian ≈ 30 · American ≈ 22 · Italian ≈ 8 · Mexican ≈ 6 · Mediterranean ≈ 5 · Asian ≈ 5 · Middle Eastern ≈ 1. (Detailed reuse/variety analysis belongs in `docs/food-report.md`.)

## Snacks (reference only — NOT in the meal catalog)
Apple + peanut butter · Muffin · Fruits · Flaxseed + dip · Tomato + cucumber · Cheese crackers · Banana + PB · Hummus + crackers · Nuts · Makhana (fox nuts) · Mamra (puffed rice) · Cherry tomato · Cucumber slices · Peppers · Granola bars · Tomato + cream · Egg bites · Steamed veggies
> The schema slots are breakfast/lunch/dinner only. Snacks + the on-hand **Fairlife shake (30g)** and **Greek yogurt cup (15g)** are the protein top-up levers for the generator.

## Excluded — NON-FOOD (kept for provenance)
- **Toddler activities:** gymnastics, library, bubble foam, jello, pool noodle threading, paint/colour matching, baking soda + vinegar, shape sorter, wall sticky, independent play, emotion card, colour sorting, water activity, little gym, walk
- **Outings:** Pike Place, Aquarium, parks
- **Events:** Kevin/Tara's Place, Superbowl @ home (menu: nachos, coleslaw, sliders, dip)
- **Shopping / prep todos:** Costco cheese, avocado, whipping cream, cherry tomato, cucumber, cream cheese, eggs, garlic powder, hummus, sponges, guac, sour cream, bake oat bars, empty freezer

## Open questions / assumptions to confirm
1. **Protein target — CONFIRMED personal.** The 70 g/day target applies only to you (your portion + supplements); other family members have no strict requirement.
2. **Salads — CONFIRMED promoted.** Greek Salad and Coleslaw are now full lunch/dinner meals *with protein added* (chicken/chickpeas). Chickpea Pasta Salad and Lentil Salad already qualified.
3. **"Leftovers"** — modeled implicitly via `leftover-friendly` tags rather than as its own item. OK?
4. **Serving sizes** are reasonable defaults; nutrition session will refine protein per these servings.
5. **Generator rules added:** restaurants (`eat-out`) never on consecutive days; lunches prefer `simple-lunch`/`quick`; `advance-prep` items get a prep-ahead reminder.

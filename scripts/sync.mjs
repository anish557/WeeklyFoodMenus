// scripts/sync.mjs
//
// Offline INGREDIENT-LEVEL nutrition builder for Weekly Food Menus.
// - Reads data/menu-data.json
// - Builds a per-ingredient per-100 g table (curated values refined by USDA FoodData
//   Central where reliable), cached to data/ingredient-nutrition.json.
// - Computes each dish = sum(ingredient per-100 g x realistic grams/serving).
// - Writes the enriched data back to data/menu-data.json
// - Emits web/menu-data.js (window.MENU_DATA = ...) so the static app needs ZERO network.
//
// The app itself never calls the network — only this script does, and only when you run it.
//
// Usage:  node scripts/sync.mjs [--refresh]   (--refresh re-queries USDA, ignoring the cache)
// Requires Node 18+ (global fetch). Key comes from config.local.json (gitignored) or
// the USDA_FDC_KEY environment variable.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = path.join(root, "data", "menu-data.json");
const PENDING_FILE = path.join(root, "data", "pending-items.json");
const WEB_JS = path.join(root, "web", "menu-data.js");

const INGREDIENT_CACHE = path.join(root, "data", "ingredient-nutrition.json");
const FORCE_REFRESH = process.argv.includes("--refresh");

// Curated per-100 g [protein_g, kcal] for cooked/as-eaten forms. Standard reference
// values; also used as fallback if a USDA lookup fails or looks implausible.
const CURATED_PER100 = {
  "almond butter":[21,614], "arborio rice":[2.4,130], "avocado":[2,160], "basil":[3,23],
  "basmati rice":[3,130], "bean sprouts":[3,30], "beans":[9,132], "bell pepper":[1,31],
  "bread":[9,265], "breadcrumbs":[13,395], "broccoli":[2.8,34], "burger bun":[9,280],
  "butter":[0.9,717], "cabbage":[1.3,25], "carrot":[0.9,41], "cauliflower":[1.9,25],
  "chana dal":[8,160], "cheddar cheese":[25,402], "cheese":[24,400], "cheese curds":[24,350],
  "chia seeds":[17,486], "chicken":[31,165], "chickpea pasta":[14,160], "chickpeas":[9,164],
  "chili powder":[13,282], "cilantro":[2,23], "cocoa powder":[20,228], "corn":[3.3,96],
  "cottage cheese":[11,98], "cream":[2,340], "cream cheese":[6,342], "cucumber":[0.7,15],
  "curry leaves":[6,108], "dal":[8,140], "dates":[1.8,282], "dumplings":[8,180],
  "egg":[13,155], "eggplant":[1,25], "enchilada sauce":[1.2,50], "feta cheese":[14,264],
  "flour":[10,364], "garlic":[6,149], "garlic sauce":[2,300], "ghee":[0,900],
  "ginger":[1.8,80], "gram flour":[22,387], "gravy":[2,55], "greek yogurt":[10,59],
  "green chili":[2,40], "ground chicken":[27,189], "ground meat":[26,250], "guacamole":[2,150],
  "herbs":[3,40], "honey":[0.3,304], "idli":[4,150], "kidney beans":[9,127],
  "lentils":[9,116], "lettuce":[1.4,15], "mango":[0.8,60], "maple syrup":[0,260],
  "mayonnaise":[1,680], "milk":[3.4,61], "millet flour":[11,382], "mixed fruit":[0.8,60],
  "mixed vegetables":[2.6,65], "moong beans":[7,105], "moong dal":[7,105], "mustard seeds":[26,508],
  "naan":[8,290], "noodles":[5,138], "oats":[13,389], "okra":[1.9,33],
  "olive oil":[0,884], "olives":[0.8,115], "onion":[1.1,40], "paneer":[18,265],
  "parmesan cheese":[38,431], "pasta":[5,158], "pav bun":[8,280], "peanuts":[26,567],
  "peas":[5,81], "pico de gallo":[1,30], "pita":[9,275], "pizza dough":[8,270],
  "poha":[6,350], "potato":[2,87], "puri":[6,400], "quinoa":[4.4,120],
  "rice":[2.7,130], "rice noodles":[1.8,108], "roti":[8,300], "salsa":[1.5,36],
  "salt":[0,0], "sambar":[3,60], "seasoning":[0,0], "soy sauce":[8,53],
  "spices":[0,250], "spinach":[2.9,23], "tamarind water":[0.3,25], "tofu":[8,76],
  "tomato":[0.9,18], "tomato sauce":[1.6,32], "toor dal":[8,140], "tortilla":[8,310],
  "tortilla chips":[7,500], "tzatziki":[3,90], "vanilla protein powder":[70,375],
  "vegetable broth":[0.5,10], "vegetables":[2,50], "waffle":[7,290], "zucchini":[1.2,17],
};

// Grams of each ingredient used in ONE serving of a dish that contains it.
const INGREDIENT_GRAMS = {
  "almond butter":16, "arborio rice":150, "avocado":70, "basil":5, "basmati rice":150,
  "bean sprouts":40, "beans":120, "bell pepper":50, "bread":60, "breadcrumbs":20,
  "broccoli":90, "burger bun":70, "butter":10, "cabbage":80, "carrot":50,
  "cauliflower":100, "chana dal":150, "cheddar cheese":30, "cheese":30, "cheese curds":40,
  "chia seeds":15, "chicken":120, "chickpea pasta":140, "chickpeas":120, "chili powder":2,
  "cilantro":3, "cocoa powder":10, "corn":60, "cottage cheese":100, "cream":30,
  "cream cheese":30, "cucumber":50, "curry leaves":1, "dal":150, "dates":20,
  "dumplings":120, "egg":100, "eggplant":80, "enchilada sauce":60, "feta cheese":40,
  "flour":40, "garlic":6, "garlic sauce":20, "ghee":8, "ginger":5,
  "gram flour":40, "gravy":60, "greek yogurt":150, "green chili":3, "ground chicken":110,
  "ground meat":110, "guacamole":40, "herbs":3, "honey":15, "idli":120,
  "kidney beans":120, "lentils":150, "lettuce":30, "mango":120, "maple syrup":20,
  "mayonnaise":15, "milk":200, "millet flour":60, "mixed fruit":120, "mixed vegetables":100,
  "moong beans":130, "moong dal":150, "mustard seeds":2, "naan":90, "noodles":140,
  "oats":40, "okra":90, "olive oil":10, "olives":15, "onion":40,
  "paneer":80, "parmesan cheese":15, "pasta":140, "pav bun":50, "peanuts":20,
  "peas":60, "pico de gallo":30, "pita":60, "pizza dough":120, "poha":60,
  "potato":120, "puri":40, "quinoa":140, "rice":150, "rice noodles":140,
  "roti":40, "salsa":30, "salt":1, "sambar":120, "seasoning":3,
  "soy sauce":10, "spices":3, "spinach":40, "tamarind water":30, "tofu":100,
  "tomato":60, "tomato sauce":80, "toor dal":150, "tortilla":50, "tortilla chips":40,
  "tzatziki":40, "vanilla protein powder":30, "vegetable broth":200, "vegetables":80,
  "waffle":70, "zucchini":90,
};

// Better USDA search queries (cooked/as-eaten) for reliable whole foods.
const QUERY_HINTS = {
  "rice":"rice white cooked", "basmati rice":"rice white cooked", "arborio rice":"rice white cooked",
  "chicken":"chicken breast roasted", "ground chicken":"chicken ground cooked",
  "ground meat":"ground beef cooked", "egg":"egg hard boiled", "potato":"potato boiled",
  "lentils":"lentils cooked", "chickpeas":"chickpeas cooked", "kidney beans":"kidney beans cooked",
  "beans":"black beans cooked", "moong beans":"mung beans cooked", "quinoa":"quinoa cooked",
  "pasta":"pasta cooked", "noodles":"noodles cooked", "rice noodles":"rice noodles cooked",
  "peas":"green peas cooked", "broccoli":"broccoli cooked", "cauliflower":"cauliflower cooked",
  "spinach":"spinach cooked", "tofu":"tofu firm", "greek yogurt":"greek yogurt plain nonfat",
  "cottage cheese":"cottage cheese lowfat", "milk":"milk whole", "oats":"oats raw",
  "cheddar cheese":"cheese cheddar", "parmesan cheese":"cheese parmesan", "feta cheese":"cheese feta",
  "cheese":"cheese cheddar", "peanuts":"peanuts", "chia seeds":"chia seeds", "almond butter":"almond butter",
  "onion":"onion raw", "tomato":"tomato raw", "cucumber":"cucumber", "carrot":"carrots raw",
  "cabbage":"cabbage raw", "bell pepper":"peppers sweet", "avocado":"avocado", "mango":"mango raw",
  "corn":"corn cooked", "okra":"okra cooked", "zucchini":"zucchini cooked", "eggplant":"eggplant cooked",
  "lettuce":"lettuce", "garlic":"garlic raw", "ginger":"ginger root", "butter":"butter",
  "olive oil":"olive oil", "flour":"wheat flour",
};

// Ingredients whose USDA matches are unreliable/composite — use curated values only.
const SKIP_USDA = new Set([
  "paneer","sambar","guacamole","tzatziki","pico de gallo","salsa","enchilada sauce",
  "garlic sauce","gravy","spices","seasoning","herbs","mixed vegetables","vegetables",
  "mixed fruit","vanilla protein powder","dumplings","idli","poha","naan","roti","puri",
  "waffle","pizza dough","pav bun","gram flour","millet flour","tamarind water",
  "vegetable broth","chili powder","mustard seeds","curry leaves","cocoa powder","dal",
  "chickpea pasta","cheese curds","breadcrumbs","tortilla chips","tortilla","burger bun",
  "pita","bread","chana dal","toor dal","moong dal","ghee","cream","cream cheese","olives",
  "dates","honey","maple syrup","mayonnaise","soy sauce","tomato sauce","bean sprouts",
  "green chili","cilantro","basil","salt",
]);

async function getKey() {
  if (process.env.USDA_FDC_KEY) return process.env.USDA_FDC_KEY;
  try {
    const cfg = JSON.parse(await readFile(path.join(root, "config.local.json"), "utf8"));
    if (cfg.USDA_FDC_KEY) return cfg.USDA_FDC_KEY;
  } catch { /* fall through */ }
  throw new Error("No USDA key. Set USDA_FDC_KEY env var or config.local.json { USDA_FDC_KEY }.");
}

const round1 = (n) => Math.round(n * 10) / 10;

function ingredientGrams(name) {
  return INGREDIENT_GRAMS[name] ?? 40;
}

function findNutrient(food, matchNames, matchNumbers, unit) {
  const list = food.foodNutrients || [];
  return list.find((n) => {
    const nm = (n.nutrientName || n.name || "").toLowerCase();
    const num = String(n.nutrientNumber ?? n.number ?? "");
    const u = (n.unitName || n.unitname || "").toUpperCase();
    const nameOk = matchNames.some((m) => nm.includes(m));
    const numOk = matchNumbers.includes(num);
    const unitOk = unit ? u === unit : true;
    return (nameOk || numOk) && unitOk;
  });
}

async function searchFdc(query, key) {
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}` +
    `&query=${encodeURIComponent(query)}&pageSize=1` +
    `&dataType=${encodeURIComponent("Survey (FNDDS),SR Legacy,Foundation")}`;

  // The USDA gateway intermittently returns HTTP 400/429/5xx (often an HTML body)
  // for perfectly valid requests under load. Retry those transient responses with
  // backoff before giving up so we don't fall back to estimates unnecessarily.
  const maxAttempts = 5;
  let lastStatus = 0;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      return json.foods && json.foods[0];
    }
    lastStatus = res.status;
    const transient = res.status === 400 || res.status === 429 || res.status >= 500;
    if (!transient || attempt === maxAttempts - 1) break;
    await sleep(400 * (attempt + 1));
  }
  throw new Error(`FDC HTTP ${lastStatus}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Build a name -> { protein_per100, kcal_per100, source, fdcId } table for all
// ingredients, using curated values plus USDA refinement where reliable.
async function buildIngredientTable(names, key, cache) {
  const table = {};
  for (const name of names) {
    if (cache[name] && !FORCE_REFRESH) { table[name] = cache[name]; continue; }

    const curated = CURATED_PER100[name];
    let entry = curated
      ? { protein_per100: curated[0], kcal_per100: curated[1], source: "curated", fdcId: null }
      : { protein_per100: 5, kcal_per100: 120, source: "default", fdcId: null };

    if (!SKIP_USDA.has(name)) {
      try {
        const food = await searchFdc(QUERY_HINTS[name] || name, key);
        if (food) {
          const p = findNutrient(food, ["protein"], ["203", "1003"]);
          const e = findNutrient(food, ["energy"], ["208", "1008"], "KCAL");
          const pv = p?.value ?? p?.amount ?? null;
          const ev = e?.value ?? e?.amount ?? null;
          const plausible = pv != null && ev != null && pv >= 0 && pv <= 90 && ev >= 5 && ev <= 950;
          // Anchor to curated: only accept USDA when it's close (rejects wrong matches
          // like "zucchini bread" for zucchini). If no curated baseline, accept plausible.
          const closeToCurated = !curated || (Math.abs(pv - curated[0]) <= 8 && ev >= curated[1] * 0.5 && ev <= curated[1] * 2);
          if (plausible && closeToCurated) {
            entry = { protein_per100: round1(pv), kcal_per100: Math.round(ev), source: "usda-fdc", fdcId: food.fdcId ?? null };
          }
        }
      } catch (err) {
        console.warn(`  ! ${name}: ${err.message} — using ${entry.source}`);
      }
      await sleep(120);
    }
    console.log(`  ${name}: ${entry.protein_per100}g/100g, ${entry.kcal_per100} kcal/100g (${entry.source})`);
    table[name] = entry;
  }
  return table;
}

// Compute one dish's nutrition by summing its ingredients.
function itemNutrition(item, table) {
  let protein = 0, calories = 0, covered = 0;
  for (const ing of item.ingredients || []) {
    const per = table[ing.name];
    if (!per) continue;
    const g = ingredientGrams(ing.name);
    protein += (per.protein_per100 * g) / 100;
    calories += (per.kcal_per100 * g) / 100;
    if (per.source !== "default") covered++;
  }
  const total = (item.ingredients || []).length || 1;
  const ratio = covered / total;
  const confidence = ratio >= 0.85 ? "medium" : "low";
  protein = Math.max(2, Math.min(70, Math.round(protein)));
  calories = Math.max(60, Math.min(1300, Math.round(calories)));
  return { protein_g: protein, calories, carbs_g: null, fat_g: null, source: "usda-ingredients", confidence, fdcId: null };
}

async function main() {
  const key = await getKey();
  const data = JSON.parse(await readFile(DATA_FILE, "utf8"));

  const names = [...new Set(data.items.flatMap((it) => (it.ingredients || []).map((i) => i.name)))].sort();

  let cache = {};
  try { cache = JSON.parse(await readFile(INGREDIENT_CACHE, "utf8")); } catch { /* none yet */ }

  console.log(`Building nutrition for ${names.length} unique ingredients (USDA + curated)${FORCE_REFRESH ? " [refresh]" : ""}...`);
  const table = await buildIngredientTable(names, key, cache);
  await writeFile(INGREDIENT_CACHE, JSON.stringify(table, null, 2) + "\n", "utf8");

  const byConfidence = {};
  for (const item of data.items) {
    item.nutrition = itemNutrition(item, table);
    byConfidence[item.nutrition.confidence] = (byConfidence[item.nutrition.confidence] || 0) + 1;
  }

  data.generatedAt = new Date().toISOString();
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");

  await mkdir(path.dirname(WEB_JS), { recursive: true });
  const banner = "// Auto-generated by scripts/sync.mjs — do not edit by hand.\n";
  await writeFile(WEB_JS, banner + "window.MENU_DATA = " + JSON.stringify(data, null, 2) + ";\n", "utf8");

  const usdaCount = Object.values(table).filter((t) => t.source === "usda-fdc").length;
  console.log(`\nDone. ${data.items.length} dishes computed from ${names.length} ingredients ` +
    `(${usdaCount} USDA-backed, rest curated).`);
  console.log(`Confidence: ${JSON.stringify(byConfidence)}`);
  console.log(`Wrote ${path.relative(root, INGREDIENT_CACHE)}, ${path.relative(root, DATA_FILE)}, and ${path.relative(root, WEB_JS)}.`);
}

main().catch((err) => {
  console.error("sync failed:", err.message);
  process.exit(1);
});

// scripts/sync.mjs
//
// Offline nutrition retrieval for Weekly Food Menus.
// - Reads data/menu-data.json
// - For each item with nutrition.source === "pending", looks up ROUGH protein + calories
//   from the USDA FoodData Central API, scaled to the item's serving size.
// - Writes the enriched data back to data/menu-data.json
// - Emits web/menu-data.js (window.MENU_DATA = ...) so the static app needs ZERO network.
//
// The app itself never calls the network — only this script does, and only when you run it.
//
// Usage:  node scripts/sync.mjs
// Requires Node 18+ (global fetch). Key comes from config.local.json (gitignored) or
// the USDA_FDC_KEY environment variable.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = path.join(root, "data", "menu-data.json");
const PENDING_FILE = path.join(root, "data", "pending-items.json");
const WEB_JS = path.join(root, "web", "menu-data.js");

// Rough grams per serving unit — used to scale USDA "per 100 g" values.
const GRAMS_PER_UNIT = {
  g: 1, plate: 400, bowl: 350, cup: 240, glass: 300, piece: 80, egg: 50,
  sandwich: 200, wrap: 250, burger: 220, taco: 100, slice: 110, roll: 90,
  bar: 60, thali: 550,
};

async function getKey() {
  if (process.env.USDA_FDC_KEY) return process.env.USDA_FDC_KEY;
  try {
    const cfg = JSON.parse(await readFile(path.join(root, "config.local.json"), "utf8"));
    if (cfg.USDA_FDC_KEY) return cfg.USDA_FDC_KEY;
  } catch { /* fall through */ }
  throw new Error("No USDA key. Set USDA_FDC_KEY env var or config.local.json { USDA_FDC_KEY }.");
}

function servingGrams(serving) {
  const per = GRAMS_PER_UNIT[serving?.unit] ?? 250;
  return (serving?.amount || 1) * per;
}

// Turn a dish name into a simpler USDA search query.
function cleanQuery(name) {
  const q = name
    .replace(/\(.*?\)/g, " ")        // drop parentheticals
    .replace(/\bwith\b.*/i, " ")     // drop "with ..." tail
    .replace(/\/.*/, " ")            // drop after a slash
    .replace(/&.*/, " ")             // drop after an ampersand
    .replace(/\s+/g, " ")
    .trim();
  return q || name;
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

async function enrichItem(item, key) {
  const grams = servingGrams(item.serving);
  const isHighProtein = (item.tags || []).includes("high-protein");

  try {
    const food = await searchFdc(cleanQuery(item.name), key);
    if (food) {
      const proteinN = findNutrient(food, ["protein"], ["203", "1003"]);
      const energyKcal = findNutrient(food, ["energy"], ["208", "1008"], "KCAL");
      const per100Protein = proteinN?.value ?? proteinN?.amount ?? null;
      const per100Kcal = energyKcal?.value ?? energyKcal?.amount ?? null;

      if (per100Protein != null || per100Kcal != null) {
        return {
          protein_g: per100Protein != null ? Math.round((per100Protein * grams) / 100) : (isHighProtein ? 25 : 10),
          calories: per100Kcal != null ? Math.round((per100Kcal * grams) / 100) : 400,
          carbs_g: null,
          fat_g: null,
          source: "usda-fdc",
          confidence: "low", // "rough" estimate scaled by assumed serving grams
          fdcId: food.fdcId ?? null,
        };
      }
    }
  } catch (err) {
    console.warn(`  ! ${item.id}: ${err.message} — using estimate`);
  }

  // Fallback rough estimate so every item always has numbers (the generator needs them).
  return {
    protein_g: isHighProtein ? 25 : 10,
    calories: 400,
    carbs_g: null,
    fat_g: null,
    source: "ai-estimate",
    confidence: "low",
    fdcId: null,
  };
}

async function main() {
  const key = await getKey();
  const data = JSON.parse(await readFile(DATA_FILE, "utf8"));

  const todo = data.items.filter((it) => it.nutrition?.source === "pending");
  console.log(`Enriching ${todo.length} of ${data.items.length} items via USDA FDC...`);

  let usda = 0, est = 0;
  for (const item of data.items) {
    if (item.nutrition?.source !== "pending") continue;
    const nutrition = await enrichItem(item, key);
    item.nutrition = nutrition;
    if (nutrition.source === "usda-fdc") usda++; else est++;
    console.log(`  ${item.id}: ${nutrition.protein_g}g protein, ${nutrition.calories} kcal (${nutrition.source})`);
    await sleep(120); // be gentle with the API
  }

  // Sanity clamp — dish-name matching + assumed serving grams produces occasional
  // impossible values. Bound them to plausible per-serving ranges so the 70g/day
  // protein logic stays meaningful. Applied to ALL items (idempotent on re-run).
  for (const item of data.items) {
    const n = item.nutrition;
    if (!n) continue;
    const proteinCap = (item.tags || []).includes("high-protein") ? 45 : 20;
    if (typeof n.protein_g === "number") n.protein_g = Math.max(2, Math.min(proteinCap, n.protein_g));
    if (typeof n.calories === "number") n.calories = Math.max(80, Math.min(900, n.calories));
  }

  data.generatedAt = new Date().toISOString();

  await writeFile(DATA_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");

  await mkdir(path.dirname(WEB_JS), { recursive: true });
  const banner = "// Auto-generated by scripts/sync.mjs — do not edit by hand.\n";
  await writeFile(WEB_JS, banner + "window.MENU_DATA = " + JSON.stringify(data, null, 2) + ";\n", "utf8");

  console.log(`\nDone. USDA-matched: ${usda}, estimated: ${est}.`);
  console.log(`Wrote ${path.relative(root, DATA_FILE)} and ${path.relative(root, WEB_JS)}.`);
  console.log(`Note: nutrition is ROUGH (dish-name match scaled by assumed serving grams). Refine as needed.`);
}

main().catch((err) => {
  console.error("sync failed:", err.message);
  process.exit(1);
});

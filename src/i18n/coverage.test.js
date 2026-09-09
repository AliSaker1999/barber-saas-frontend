import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import en from "./en";
import ar from "./ar";

/*
 * Translation coverage.
 *
 * A missing key doesn't crash — `t()` falls through to returning the key
 * itself, so the bug ships as a screen reading "no_upcoming_title". These two
 * tests make that a failing build instead:
 *
 *   1. every t("…") in the source resolves in English
 *   2. every English key has an Arabic translation
 *
 * Only literal keys can be checked statically; the handful of computed ones
 * (`t(\`step_${step}\`)`) are listed in DYNAMIC_KEYS so they're still covered.
 */

/* ESM has no __dirname, and this file is linted as browser ESM. */
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Keys built at runtime from a template literal or a variable. */
const DYNAMIC_KEYS = [
  /* BookingFlow: t(`step_${step}`) */
  "step_service",
  "step_barber",
  "step_time",
  "step_confirm",
  /* ShopProfile / Settings day names: t(DAY_KEYS[i]) and t(entry.labelKey) */
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  /* Home: t(greetingKey()) */
  "greeting_morning",
  "greeting_afternoon",
  "greeting_evening",
  /* BookingFlow slot groups: t(period) */
  "morning",
  "afternoon",
  "evening"
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry.name) && !/\.test\./.test(entry.name)) files.push(full);
  }
  return files;
}

function collectLiteralKeys() {
  /* t("key") or t('key'), with or without a params argument. */
  const pattern = /\bt\(\s*["']([a-z0-9_]+)["']\s*[,)]/g;
  const found = new Map();

  for (const file of walk(SRC)) {
    const text = fs.readFileSync(file, "utf8");
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const key = match[1];
      if (!found.has(key)) found.set(key, path.relative(SRC, file).replace(/\\/g, "/"));
    }
  }
  return found;
}

describe("translation coverage", () => {
  it("resolves every key used in the source", () => {
    const used = collectLiteralKeys();
    const missing = [];

    for (const [key, file] of used) {
      if (en[key] === undefined) missing.push(`${key} (${file})`);
    }

    for (const key of DYNAMIC_KEYS) {
      if (en[key] === undefined) missing.push(`${key} (dynamic)`);
    }

    expect(missing, `Missing English keys:\n  ${missing.join("\n  ")}`).toEqual([]);
  });

  it("has an Arabic translation for every English key", () => {
    // Arabic is a first-class language here (spec §19), not an afterthought —
    // an untranslated key silently falls back to English mid-sentence.
    const missing = Object.keys(en).filter((key) => ar[key] === undefined);

    expect(missing, `Missing Arabic keys:\n  ${missing.join("\n  ")}`).toEqual([]);
  });

  it("leaves no placeholder unmatched between the two languages", () => {
    // "{n}" in English but "{count}" in Arabic silently renders the raw brace
    // to an Arabic-speaking customer.
    const mismatched = [];
    const placeholders = (value) =>
      typeof value === "string" ? (value.match(/\{[a-z]+\}/g) || []).sort().join(",") : "";

    for (const key of Object.keys(en)) {
      if (ar[key] === undefined) continue;
      if (placeholders(en[key]) !== placeholders(ar[key])) {
        mismatched.push(`${key}: en(${placeholders(en[key])}) vs ar(${placeholders(ar[key])})`);
      }
    }

    expect(mismatched, `Placeholder mismatch:\n  ${mismatched.join("\n  ")}`).toEqual([]);
  });
});

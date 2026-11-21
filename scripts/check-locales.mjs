import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LANGUAGES = ["ar", "en", "tr"];
const SOURCE_LANG = "ar";
const ARABIC_RE = /[\u0600-\u06FF]/;
const PLACEHOLDER_RE = /\{\{\s*([^}]+?)\s*\}\}/g;
const PLURAL_SUFFIXES = ["_zero", "_one", "_two", "_few", "_many", "_other"];

// Exact string values permitted to contain Arabic characters in non-Arabic locales.
const ARABIC_ALLOWLIST = [];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_LOCALES_DIR = path.resolve(__dirname, "../src/locales");

function resolveLocalesDir(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--dir=")) {
      return path.resolve(process.cwd(), arg.slice("--dir=".length));
    }
    if (arg === "--dir" && argv[i + 1]) {
      return path.resolve(process.cwd(), argv[i + 1]);
    }
    if (!arg.startsWith("-")) {
      return path.resolve(process.cwd(), arg);
    }
  }
  if (process.env.LOCALES_DIR) {
    return path.resolve(process.cwd(), process.env.LOCALES_DIR);
  }
  return DEFAULT_LOCALES_DIR;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function flattenObject(obj, fileLabel, errors, prefix = "", out = new Map()) {
  const entries = Object.entries(obj);
  if (prefix && entries.length === 0) {
    errors.push(`Empty object in ${fileLabel} at "${prefix}"`);
    return out;
  }

  for (const [key, value] of entries) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      flattenObject(value, fileLabel, errors, fullKey, out);
    } else if (typeof value !== "string") {
      const kind = Array.isArray(value)
        ? "array"
        : value === null
          ? "null"
          : typeof value;
      errors.push(`Non-string value (${kind}) in ${fileLabel} at "${fullKey}"`);
    } else {
      if (value.trim() === "") {
        errors.push(`Empty string value in ${fileLabel} at "${fullKey}"`);
      }
      out.set(fullKey, value);
    }
  }

  return out;
}

function splitPluralKey(fullKey) {
  const dotIdx = fullKey.lastIndexOf(".");
  const prefix = dotIdx === -1 ? "" : fullKey.slice(0, dotIdx + 1);
  const lastSegment = dotIdx === -1 ? fullKey : fullKey.slice(dotIdx + 1);

  for (const suffix of PLURAL_SUFFIXES) {
    if (lastSegment.endsWith(suffix) && lastSegment.length > suffix.length) {
      return {
        baseKey: `${prefix}${lastSegment.slice(0, -suffix.length)}`,
        suffix,
      };
    }
  }
  return null;
}

function partitionLocaleKeys(flatMap) {
  const plainKeys = new Map();
  const pluralGroups = new Map();

  for (const [key, value] of flatMap.entries()) {
    const plural = splitPluralKey(key);
    if (plural) {
      let forms = pluralGroups.get(plural.baseKey);
      if (!forms) {
        forms = new Map();
        pluralGroups.set(plural.baseKey, forms);
      }
      forms.set(plural.suffix, value);
    } else {
      plainKeys.set(key, value);
    }
  }

  return { plainKeys, pluralGroups, rawMap: flatMap };
}

function extractPlaceholders(text, { ignoreCount = false } = {}) {
  const names = new Set();
  for (const match of text.matchAll(PLACEHOLDER_RE)) {
    const name = match[1].split(",")[0].trim();
    if (!name) continue;
    if (ignoreCount && name === "count") continue;
    names.add(name);
  }
  return [...names].sort();
}

function placeholdersEqual(a, b) {
  return a.length === b.length && a.every((name, idx) => name === b[idx]);
}

function formatPlaceholders(names) {
  return names.length > 0 ? names.map((n) => `{{${n}}}`).join(", ") : "(none)";
}

function main() {
  const localesDir = resolveLocalesDir(process.argv.slice(2));

  if (!fs.existsSync(localesDir)) {
    console.log(
      `[i18n:check] Locales directory not found (${localesDir}); skipping check.`
    );
    process.exit(0);
  }

  if (!fs.statSync(localesDir).isDirectory()) {
    console.error(`[i18n:check] Locales path is not a directory: ${localesDir}`);
    process.exit(1);
  }

  const namespaceSet = new Set();
  for (const lang of LANGUAGES) {
    const langDir = path.join(localesDir, lang);
    if (!fs.existsSync(langDir) || !fs.statSync(langDir).isDirectory()) {
      continue;
    }
    for (const entry of fs.readdirSync(langDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".json")) {
        namespaceSet.add(entry.name);
      }
    }
  }

  const namespaces = [...namespaceSet].sort();
  if (namespaces.length === 0) {
    console.log(
      `[i18n:check] No locale JSON files found under ${localesDir}; skipping check.`
    );
    process.exit(0);
  }

  const errorsByNs = new Map();
  const warningsByNs = new Map();
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalSourceKeys = 0;

  for (const nsFile of namespaces) {
    const nsErrors = [];
    const nsWarnings = [];
    const parsedByLang = new Map();

    for (const lang of LANGUAGES) {
      const fileLabel = `${lang}/${nsFile}`;
      const filePath = path.join(localesDir, lang, nsFile);

      if (!fs.existsSync(filePath)) {
        nsErrors.push(`Missing file: ${fileLabel}`);
        continue;
      }

      let parsed;
      try {
        const raw = fs.readFileSync(filePath, "utf8");
        parsed = JSON.parse(raw);
      } catch (err) {
        nsErrors.push(`Invalid JSON in ${fileLabel}: ${err.message}`);
        continue;
      }

      if (!isPlainObject(parsed)) {
        nsErrors.push(`Invalid root value in ${fileLabel}: expected JSON object`);
        continue;
      }

      const flatMap = flattenObject(parsed, fileLabel, nsErrors);
      const partitioned = partitionLocaleKeys(flatMap);
      parsedByLang.set(lang, partitioned);

      for (const [baseKey, forms] of partitioned.pluralGroups.entries()) {
        if (lang === SOURCE_LANG) {
          if (!forms.has("_other")) {
            nsErrors.push(
              `Incomplete plural group in ${fileLabel} at "${baseKey}": ${SOURCE_LANG} requires "_other"`
            );
          }
        } else {
          if (!forms.has("_one")) {
            nsErrors.push(
              `Incomplete plural group in ${fileLabel} at "${baseKey}": ${lang} requires "_one"`
            );
          }
          if (!forms.has("_other")) {
            nsErrors.push(
              `Incomplete plural group in ${fileLabel} at "${baseKey}": ${lang} requires "_other"`
            );
          }
        }
      }
    }

    const source = parsedByLang.get(SOURCE_LANG);
    if (source) {
      totalSourceKeys += source.rawMap.size;

      for (const lang of LANGUAGES) {
        if (lang === SOURCE_LANG) continue;
        const target = parsedByLang.get(lang);
        if (!target) continue;

        const fileLabel = `${lang}/${nsFile}`;

        for (const key of source.plainKeys.keys()) {
          if (!target.plainKeys.has(key)) {
            nsErrors.push(`Missing key in ${fileLabel}: "${key}"`);
          }
        }

        for (const key of target.plainKeys.keys()) {
          if (!source.plainKeys.has(key)) {
            nsErrors.push(`Extra key in ${fileLabel}: "${key}"`);
          }
        }

        for (const [key, sourceVal] of source.plainKeys.entries()) {
          if (!target.plainKeys.has(key)) continue;
          const targetVal = target.plainKeys.get(key);

          const sourcePh = extractPlaceholders(sourceVal);
          const targetPh = extractPlaceholders(targetVal);

          if (!placeholdersEqual(sourcePh, targetPh)) {
            nsErrors.push(
              `Placeholder mismatch in ${fileLabel} at "${key}": ${SOURCE_LANG} has [${formatPlaceholders(sourcePh)}], ${lang} has [${formatPlaceholders(targetPh)}]`
            );
          }
        }

        for (const baseKey of source.pluralGroups.keys()) {
          if (!target.pluralGroups.has(baseKey)) {
            nsErrors.push(`Missing plural key base in ${fileLabel}: "${baseKey}"`);
          }
        }

        for (const baseKey of target.pluralGroups.keys()) {
          if (!source.pluralGroups.has(baseKey)) {
            nsErrors.push(`Extra plural key base in ${fileLabel}: "${baseKey}"`);
          }
        }

        for (const [baseKey, sourceForms] of source.pluralGroups.entries()) {
          const targetForms = target.pluralGroups.get(baseKey);
          if (!targetForms) continue;

          const sourceOtherVal = sourceForms.get("_other");
          if (sourceOtherVal === undefined) continue;

          const sourcePh = extractPlaceholders(sourceOtherVal, {
            ignoreCount: true,
          });

          for (const [suffix, targetVal] of targetForms.entries()) {
            const targetPh = extractPlaceholders(targetVal, {
              ignoreCount: true,
            });
            if (!placeholdersEqual(sourcePh, targetPh)) {
              nsErrors.push(
                `Placeholder mismatch in ${fileLabel} at "${baseKey}${suffix}" (vs ${SOURCE_LANG} "${baseKey}_other"): ${SOURCE_LANG} has [${formatPlaceholders(sourcePh)}], ${lang} has [${formatPlaceholders(targetPh)}]`
              );
            }
          }
        }
      }
    }

    for (const lang of LANGUAGES) {
      if (lang === SOURCE_LANG) continue;
      const target = parsedByLang.get(lang);
      if (!target) continue;

      const fileLabel = `${lang}/${nsFile}`;
      for (const [key, value] of target.rawMap.entries()) {
        if (
          ARABIC_RE.test(value) &&
          !key.endsWith("_ar") &&
          !ARABIC_ALLOWLIST.includes(value)
        ) {
          nsWarnings.push(
            `Arabic text in ${fileLabel} at "${key}": ${JSON.stringify(value)}`
          );
        }
      }
    }

    if (nsErrors.length > 0) {
      errorsByNs.set(nsFile, nsErrors);
      totalErrors += nsErrors.length;
    }
    if (nsWarnings.length > 0) {
      warningsByNs.set(nsFile, nsWarnings);
      totalWarnings += nsWarnings.length;
    }
  }

  if (warningsByNs.size > 0) {
    console.warn(`[i18n:check] Warnings (${totalWarnings}):`);
    for (const [nsFile, warnings] of warningsByNs.entries()) {
      console.warn(`\n  ${nsFile}:`);
      for (const warning of warnings) {
        console.warn(`    - ${warning}`);
      }
    }
    console.warn("");
  }

  if (errorsByNs.size > 0) {
    console.error(`[i18n:check] Errors (${totalErrors}):`);
    for (const [nsFile, errors] of errorsByNs.entries()) {
      console.error(`\n  ${nsFile}:`);
      for (const error of errors) {
        console.error(`    - ${error}`);
      }
    }
    console.error(
      `\n[i18n:check] Failed: ${totalErrors} error(s), ${totalWarnings} warning(s) across ${namespaces.length} namespace(s).`
    );
    process.exit(1);
  }

  console.log(
    `[i18n:check] OK: checked ${namespaces.length} namespace(s) (${totalSourceKeys} ${SOURCE_LANG} key(s)) across ${LANGUAGES.join(", ")} — 0 errors, ${totalWarnings} warning(s).`
  );
}

main();

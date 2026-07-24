import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const localeFiles = {
  th: resolve(projectDirectory, "locales/th.json"),
  en: resolve(projectDirectory, "locales/en.json")
};

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const flatten = (value, prefix = "", output = {}) => {
  if (Array.isArray(value)) {
    throw new Error(`Dictionary ห้ามใช้ Array: ${prefix || "(root)"}`);
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, child]) => {
      if (!prefix && key === "_meta") return;
      flatten(child, prefix ? `${prefix}.${key}` : key, output);
    });
    return output;
  }
  if (typeof value !== "string") {
    throw new Error(`ค่าของ ${prefix} ต้องเป็นข้อความ`);
  }
  if (!value.trim()) {
    throw new Error(`คำแปลของ ${prefix} เป็นค่าว่าง`);
  }
  output[prefix] = value;
  return output;
};
const placeholders = (text) => [...new Set(
  [...text.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)].map((match) => match[1])
)].sort();
const difference = (left, right) => left.filter((key) => !right.includes(key));

const dictionaries = Object.fromEntries(await Promise.all(
  Object.entries(localeFiles).map(async ([locale, file]) => [locale, await readJson(file)])
));
const flat = Object.fromEntries(
  Object.entries(dictionaries).map(([locale, dictionary]) => [locale, flatten(dictionary)])
);
const thaiKeys = Object.keys(flat.th).sort();
const englishKeys = Object.keys(flat.en).sort();
const missingInEnglish = difference(thaiKeys, englishKeys);
const missingInThai = difference(englishKeys, thaiKeys);
const placeholderErrors = thaiKeys
  .filter((key) => key in flat.en)
  .flatMap((key) => {
    const thai = placeholders(flat.th[key]);
    const english = placeholders(flat.en[key]);
    return JSON.stringify(thai) === JSON.stringify(english)
      ? []
      : [`${key}: th=${thai.join(",") || "-"} en=${english.join(",") || "-"}`];
  });

if (missingInEnglish.length || missingInThai.length || placeholderErrors.length) {
  if (missingInEnglish.length) {
    console.error(`en.json ขาด ${missingInEnglish.length} key:`, missingInEnglish.join(", "));
  }
  if (missingInThai.length) {
    console.error(`th.json ขาด ${missingInThai.length} key:`, missingInThai.join(", "));
  }
  if (placeholderErrors.length) {
    console.error("Placeholder ไม่ตรงกัน:", placeholderErrors.join("; "));
  }
  process.exitCode = 1;
} else {
  console.log(`i18n พร้อมใช้งาน: th/en มี ${thaiKeys.length} key ตรงกัน`);
}

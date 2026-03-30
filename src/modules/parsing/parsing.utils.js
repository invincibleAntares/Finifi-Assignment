function stripCodeFences(text) {
  if (!text) return "";
  return String(text)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonObject(text) {
  const cleaned = stripCodeFences(text);
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Gemini did not return a JSON object");
  }
  return cleaned.slice(firstBrace, lastBrace + 1);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function toStringOrNull(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function parseDateToISO(dateStr) {
  const s = toStringOrNull(dateStr);
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const dd = String(dmy[1]).padStart(2, "0");
    const mm = String(dmy[2]).padStart(2, "0");
    const yyyy = dmy[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function normalizeSku(sku) {
  const s = toStringOrNull(sku);
  if (!s) return null;
  // SKU is numeric-only. If it contains letters/dashes, it is a docItemCode (invoice) not a SKU.
  const compact = s.replace(/\s+/g, "");
  if (!/^\d{3,}$/.test(compact)) return null;
  return compact;
}

function normalizeDescription(description) {
  const desc = toStringOrNull(description);
  if (!desc) return null;

  // Light, general normalization only. The heavy lifting should be done by Gemini.
  let s = desc;

  // Normalize common concatenations and units (no PDF-specific hacks)
  s = s.replace(/([a-z])([A-Z])/g, "$1 $2"); // CamelCase splits
  s = s.replace(/([a-zA-Z])(\d)/g, "$1 $2");
  s = s.replace(/(\d)([a-zA-Z])/g, "$1 $2");

  s = s.toUpperCase();

  // Remove parenthetical noise like "(5%)", "(Mince)" without inventing meaning.
  s = s.replace(/\([^)]*\)/g, " ");
  // Remove standalone percentage tokens that survive OCR.
  s = s.replace(/\b\d+(?:\.\d+)?\s*%+\b/g, " ");

  s = s
    .replace(/&/g, " ")
    .replace(/-/g, " ")
    .replace(/\bVEGETABLE\b/g, "VEG")
    .replace(/\bCUTS\b/g, "CUT")
    .replace(/\bKABAB\b/g, "KEBAB")
    .replace(/\bKEEMA\b/g, "KHEEMA")
    .replace(/\bPLAIN\s+SALAMI\b/g, "SALAMI")
    .replace(/\bPCS\b/g, "PIECES")
    .replace(/\bPC\b/g, "PIECES")
    .replace(/\bPIECE\b/g, "PIECES")
    .replace(/\bGRAMS?\b/g, "G")
    .replace(/\bKILOGRAMS?\b/g, "KG")
    .replace(/\bGMS?\b/g, "G")
    .replace(/\bML\b/g, "ML");

  // Strip common noise words but don't over-normalize product meaning
  s = s
    .replace(/\bRTC\b/g, " ")
    .replace(/\bFROZEN\b/g, " ")
    .replace(/\bPSM\b/g, " ")
    .replace(/\bMEATIGO\b/g, " ");

  // Remove trailing attribute tails if present
  s = s.split(/\b(COLOUR|COLOR|SIZE|BRAND)\s*:/i)[0];

  // Normalize numeric ".0" inside descriptions
  s = s.replace(/\b(\d+)\.0\b/g, "$1");

  s = s
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return s || null;
}

function buildMatchKey({ description }) {
  // Compatibility wrapper; use normalizedDescription as match key.
  return normalizeDescription(description);
}

module.exports = {
  extractJsonObject,
  toNumber,
  toStringOrNull,
  parseDateToISO,
  normalizeSku,
  normalizeDescription,
  buildMatchKey
};

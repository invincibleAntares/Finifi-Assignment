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

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // dd-mm-yyyy or d-m-yyyy
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const dd = String(dmy[1]).padStart(2, "0");
    const mm = String(dmy[2]).padStart(2, "0");
    const yyyy = dmy[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // "Mar 17, 2026" etc.
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function buildMatchKey({ sku, description }) {
  const skuStr = toStringOrNull(sku);
  if (skuStr) return skuStr.toUpperCase();

  const desc = toStringOrNull(description);
  if (!desc) return null;

  return desc
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = {
  extractJsonObject,
  toNumber,
  toStringOrNull,
  parseDateToISO,
  buildMatchKey
};


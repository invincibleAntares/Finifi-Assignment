function buildPrompt({ documentType }) {
  return [
    "You are extracting structured data from a PDF.",
    "Return ONLY a valid JSON object (no markdown, no code fences, no extra text).",
    "If a field is missing, use null (do not invent values).",
    "",
    "General rules:",
    "- Dates must be in YYYY-MM-DD format (string).",
    "- Quantities must be numbers.",
    "- items must be an array (empty if none).",
    "",
    `Document type: ${documentType}`,
    "",
    "Required output shape by documentType:",
    "",
    "If documentType == 'po':",
    "{",
    '  "poNumber": "string|null",',
    '  "poDate": "YYYY-MM-DD|null",',
    '  "vendorName": "string|null",',
    '  "items": [ { "sku": "string|null", "description": "string|null", "quantity": 0 } ]',
    "}",
    "",
    "If documentType == 'grn':",
    "{",
    '  "grnNumber": "string|null",',
    '  "poNumber": "string|null",',
    '  "grnDate": "YYYY-MM-DD|null",',
    '  "items": [ { "sku": "string|null", "description": "string|null", "receivedQuantity": 0 } ]',
    "}",
    "",
    "If documentType == 'invoice':",
    "{",
    '  "invoiceNumber": "string|null",',
    '  "poNumber": "string|null",',
    '  "invoiceDate": "YYYY-MM-DD|null",',
    '  "items": [ { "sku": "string|null", "description": "string|null", "quantity": 0 } ]',
    "}"
  ].join("\n");
}

module.exports = { buildPrompt };


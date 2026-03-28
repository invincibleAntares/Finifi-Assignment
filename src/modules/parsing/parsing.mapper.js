const { buildMatchKey, parseDateToISO, toNumber, toStringOrNull } = require("./parsing.utils");

function normalizeItems(items, qtyField) {
  const arr = Array.isArray(items) ? items : [];
  return arr
    .map((it) => {
      const sku = toStringOrNull(it?.sku ?? it?.itemCode);
      const description = toStringOrNull(it?.description);
      const qty = toNumber(it?.[qtyField]);
      const matchKey = buildMatchKey({ sku, description });

      if (!matchKey || qty === null) return null;

      return { matchKey, sku, description, [qtyField]: qty };
    })
    .filter(Boolean);
}

function mapGeminiJsonToNormalized({ documentType, geminiJson }) {
  const data = geminiJson && typeof geminiJson === "object" ? geminiJson : {};

  if (documentType === "po") {
    const poNumber = toStringOrNull(data.poNumber);
    return {
      extracted: {
        poNumber,
        vendorName: toStringOrNull(data.vendorName),
        poDate: parseDateToISO(data.poDate)
      },
      normalized: {
        poNumber,
        poDate: parseDateToISO(data.poDate),
        vendorName: toStringOrNull(data.vendorName),
        items: normalizeItems(data.items, "quantity").map((x) => ({
          matchKey: x.matchKey,
          sku: x.sku,
          description: x.description,
          quantity: x.quantity
        }))
      }
    };
  }

  if (documentType === "grn") {
    const poNumber = toStringOrNull(data.poNumber);
    return {
      extracted: {
        poNumber,
        grnNumber: toStringOrNull(data.grnNumber),
        grnDate: parseDateToISO(data.grnDate)
      },
      normalized: {
        poNumber,
        grnNumber: toStringOrNull(data.grnNumber),
        grnDate: parseDateToISO(data.grnDate),
        items: normalizeItems(data.items, "receivedQuantity").map((x) => ({
          matchKey: x.matchKey,
          sku: x.sku,
          description: x.description,
          receivedQuantity: x.receivedQuantity
        }))
      }
    };
  }

  if (documentType === "invoice") {
    const poNumber = toStringOrNull(data.poNumber);
    return {
      extracted: {
        poNumber,
        invoiceNumber: toStringOrNull(data.invoiceNumber),
        invoiceDate: parseDateToISO(data.invoiceDate)
      },
      normalized: {
        poNumber,
        invoiceNumber: toStringOrNull(data.invoiceNumber),
        invoiceDate: parseDateToISO(data.invoiceDate),
        items: normalizeItems(data.items, "quantity").map((x) => ({
          matchKey: x.matchKey,
          sku: x.sku,
          description: x.description,
          quantity: x.quantity
        }))
      }
    };
  }

  throw new Error(`Unsupported documentType: ${documentType}`);
}

module.exports = { mapGeminiJsonToNormalized };


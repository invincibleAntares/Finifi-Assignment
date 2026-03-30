const { normalizeDescription, normalizeSku, parseDateToISO, toNumber, toStringOrNull } = require("./parsing.utils");

function normalizeItems(items, qtyField) {
  const arr = Array.isArray(items) ? items : [];
  return arr
    .map((it) => {
      const skuRaw = toStringOrNull(it?.sku);
      const docItemCode = toStringOrNull(it?.docItemCode ?? it?.itemCode);
      const rawDescription = toStringOrNull(it?.rawDescription ?? it?.description);
      const cleanFromGemini = toStringOrNull(it?.cleanDescription) || toStringOrNull(it?.description) || rawDescription;
      const qty = toNumber(it?.[qtyField]);
      const normalizedDescription = normalizeDescription(cleanFromGemini);
      const sku = normalizeSku(skuRaw);

      if (!normalizedDescription || qty === null) return null;

      return {
        sku,
        docItemCode,
        rawDescription,
        cleanDescriptionFromGemini: cleanFromGemini,
        normalizedDescription,
        [qtyField]: qty
      };
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
          sku: x.sku,
          docItemCode: x.docItemCode,
          rawDescription: x.rawDescription,
          cleanDescriptionFromGemini: x.cleanDescriptionFromGemini,
          normalizedDescription: x.normalizedDescription,
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
          sku: x.sku,
          docItemCode: x.docItemCode,
          rawDescription: x.rawDescription,
          cleanDescriptionFromGemini: x.cleanDescriptionFromGemini,
          normalizedDescription: x.normalizedDescription,
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
          sku: x.sku,
          docItemCode: x.docItemCode,
          rawDescription: x.rawDescription,
          cleanDescriptionFromGemini: x.cleanDescriptionFromGemini,
          normalizedDescription: x.normalizedDescription,
          quantity: x.quantity
        }))
      }
    };
  }

  throw new Error(`Unsupported documentType: ${documentType}`);
}

module.exports = { mapGeminiJsonToNormalized };


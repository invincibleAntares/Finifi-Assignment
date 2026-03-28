const PurchaseOrder = require("../../models/po.model");
const GRN = require("../../models/grn.model");
const Invoice = require("../../models/invoice.model");

function isoToDateOrNull(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function storeStructuredRecord({ documentType, documentId, normalized }) {
  if (!normalized || typeof normalized !== "object") {
    throw new Error("Missing normalized parsed data");
  }

  if (documentType === "po") {
    return await PurchaseOrder.findOneAndUpdate(
      { documentId },
      {
        documentId,
        poNumber: normalized.poNumber,
        poDate: isoToDateOrNull(normalized.poDate),
        vendorName: normalized.vendorName || null,
        items: Array.isArray(normalized.items) ? normalized.items : []
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  if (documentType === "grn") {
    return await GRN.findOneAndUpdate(
      { documentId },
      {
        documentId,
        poNumber: normalized.poNumber,
        grnNumber: normalized.grnNumber || null,
        grnDate: isoToDateOrNull(normalized.grnDate),
        items: Array.isArray(normalized.items) ? normalized.items : []
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  if (documentType === "invoice") {
    return await Invoice.findOneAndUpdate(
      { documentId },
      {
        documentId,
        poNumber: normalized.poNumber,
        invoiceNumber: normalized.invoiceNumber || null,
        invoiceDate: isoToDateOrNull(normalized.invoiceDate),
        items: Array.isArray(normalized.items) ? normalized.items : []
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  throw new Error(`Unsupported documentType: ${documentType}`);
}

module.exports = { storeStructuredRecord };


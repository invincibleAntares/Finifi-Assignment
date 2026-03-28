const MatchResult = require("../../models/matchResult.model");
const PurchaseOrder = require("../../models/po.model");
const GRN = require("../../models/grn.model");
const Invoice = require("../../models/invoice.model");

function sumByMatchKey(items, qtyField) {
  const map = new Map();
  for (const it of Array.isArray(items) ? items : []) {
    const key = it?.matchKey;
    const qty = Number(it?.[qtyField]);
    if (!key || !Number.isFinite(qty)) continue;
    map.set(key, (map.get(key) || 0) + qty);
  }
  return map;
}

function mapKeysToObject(map) {
  const obj = {};
  for (const [k, v] of map.entries()) obj[k] = v;
  return obj;
}

function addReason(reasons, reason) {
  reasons.push({
    code: reason.code,
    message: reason.message || undefined,
    itemMatchKey: reason.itemMatchKey || undefined,
    expected: reason.expected,
    actual: reason.actual
  });
}

function computeStatus({ hasAllDocs, reasons, poQtyByKey, grnQtyByKey, invoiceQtyByKey }) {
  if (!hasAllDocs) return "insufficient_documents";
  if (reasons.length > 0) return "mismatch";

  const poKeys = Array.from(poQtyByKey.keys());
  const allEqual = poKeys.every((k) => {
    const po = poQtyByKey.get(k) || 0;
    const grn = grnQtyByKey.get(k) || 0;
    const inv = invoiceQtyByKey.get(k) || 0;
    return po === grn && po === inv;
  });

  return allEqual ? "matched" : "partially_matched";
}

async function recomputeMatchForPoNumber(poNumber) {
  if (!poNumber) throw new Error("poNumber is required");

  const [pos, grns, invoices] = await Promise.all([
    PurchaseOrder.find({ poNumber }).sort({ createdAt: -1 }).lean(),
    GRN.find({ poNumber }).sort({ createdAt: -1 }).lean(),
    Invoice.find({ poNumber }).sort({ createdAt: -1 }).lean()
  ]);

  const reasons = [];

  const poLatest = pos[0] || null;
  if (pos.length > 1) {
    addReason(reasons, { code: "duplicate_po", message: `Found ${pos.length} POs for ${poNumber}` });
  }

  const hasAllDocs = Boolean(poLatest) && grns.length > 0 && invoices.length > 0;

  const poQtyByKey = sumByMatchKey(poLatest?.items, "quantity");
  const grnQtyByKey = new Map();
  const invoiceQtyByKey = new Map();

  // Sum GRN quantities and validate keys exist in PO
  for (const g of grns) {
    const m = sumByMatchKey(g.items, "receivedQuantity");
    for (const [key, qty] of m.entries()) {
      if (!poQtyByKey.has(key)) {
        addReason(reasons, { code: "item_missing_in_po", itemMatchKey: key });
      }
      grnQtyByKey.set(key, (grnQtyByKey.get(key) || 0) + qty);
    }
  }

  // Sum invoice quantities and validate keys exist in PO
  for (const inv of invoices) {
    const m = sumByMatchKey(inv.items, "quantity");
    for (const [key, qty] of m.entries()) {
      if (!poQtyByKey.has(key)) {
        addReason(reasons, { code: "item_missing_in_po", itemMatchKey: key });
      }
      invoiceQtyByKey.set(key, (invoiceQtyByKey.get(key) || 0) + qty);
    }
  }

  // Quantity rules (item-level)
  for (const [key, grnQty] of grnQtyByKey.entries()) {
    const poQty = poQtyByKey.get(key) || 0;
    if (grnQty > poQty) {
      addReason(reasons, { code: "grn_qty_exceeds_po_qty", itemMatchKey: key, expected: poQty, actual: grnQty });
    }
  }

  for (const [key, invQty] of invoiceQtyByKey.entries()) {
    const poQty = poQtyByKey.get(key) || 0;
    const grnQty = grnQtyByKey.get(key) || 0;

    if (invQty > poQty) {
      addReason(reasons, { code: "invoice_qty_exceeds_po_qty", itemMatchKey: key, expected: poQty, actual: invQty });
    }
    if (invQty > grnQty) {
      addReason(reasons, { code: "invoice_qty_exceeds_grn_qty", itemMatchKey: key, expected: grnQty, actual: invQty });
    }
  }

  // Date rule: invoiceDate must not be after poDate
  if (poLatest?.poDate) {
    const poDate = new Date(poLatest.poDate);
    const anyInvoiceAfterPo = invoices.some((i) => i?.invoiceDate && new Date(i.invoiceDate) > poDate);
    if (anyInvoiceAfterPo) {
      addReason(reasons, { code: "invoice_date_after_po_date" });
    }
  }

  const status = computeStatus({ hasAllDocs, reasons, poQtyByKey, grnQtyByKey, invoiceQtyByKey });

  const linked = {
    documentIds: [],
    purchaseOrderIds: poLatest ? [poLatest._id] : [],
    grnIds: grns.map((g) => g._id),
    invoiceIds: invoices.map((i) => i._id)
  };

  const upserted = await MatchResult.findOneAndUpdate(
    { poNumber },
    {
      poNumber,
      status,
      reasons,
      linked,
      computedAt: new Date(),
      // Helpful debug for development; can remove later if you want.
      debug: {
        poQtyByKey: mapKeysToObject(poQtyByKey),
        grnQtyByKey: mapKeysToObject(grnQtyByKey),
        invoiceQtyByKey: mapKeysToObject(invoiceQtyByKey)
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return upserted;
}

module.exports = { recomputeMatchForPoNumber };


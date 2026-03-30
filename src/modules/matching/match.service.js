const MatchResult = require("../../models/matchResult.model");
const PurchaseOrder = require("../../models/po.model");
const GRN = require("../../models/grn.model");
const Invoice = require("../../models/invoice.model");
const Document = require("../../models/document.model");

function isUsableSku(s) {
  if (!s) return false;
  const str = String(s).trim();
  return /^\d{3,}$/.test(str);
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

function buildPoIndex(poItems) {
  const skuToKey = new Map(); // sku -> canonicalKey
  const descToKey = new Map(); // normalizedDescription -> canonicalKey
  const poQtyByKey = new Map(); // canonicalKey -> qty

  for (const it of Array.isArray(poItems) ? poItems : []) {
    const sku = it?.sku ? String(it.sku).trim() : null;
    const desc = it?.normalizedDescription ? String(it.normalizedDescription).trim() : null;
    const qty = Number(it?.quantity);
    if (!Number.isFinite(qty) || qty < 0) continue;

    const canonicalKey = isUsableSku(sku) ? `SKU:${sku}` : desc ? `DESC:${desc}` : null;
    if (!canonicalKey) continue;

    poQtyByKey.set(canonicalKey, (poQtyByKey.get(canonicalKey) || 0) + qty);

    if (isUsableSku(sku)) skuToKey.set(sku, canonicalKey);
    if (desc) descToKey.set(desc, canonicalKey);
  }

  return { skuToKey, descToKey, poQtyByKey };
}

function mapItemToPoKey({ item, skuToKey, descToKey }) {
  const sku = item?.sku ? String(item.sku).trim() : null;
  if (isUsableSku(sku) && skuToKey.has(sku)) return skuToKey.get(sku);

  const desc = item?.normalizedDescription ? String(item.normalizedDescription).trim() : null;
  if (desc && descToKey.has(desc)) return descToKey.get(desc);

  return null;
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

  const [pos, grns, invoices, documents] = await Promise.all([
    PurchaseOrder.find({ poNumber }).sort({ createdAt: -1 }).lean(),
    GRN.find({ poNumber }).sort({ createdAt: -1 }).lean(),
    Invoice.find({ poNumber }).sort({ createdAt: -1 }).lean(),
    Document.find({ "extracted.poNumber": poNumber }).select({ _id: 1 }).lean()
  ]);

  // De-duplicate GRNs/Invoices by their business numbers to avoid double counting
  // when the same PDF is uploaded multiple times.
  function dedupeByNumber(list, numberField) {
    const seen = new Set();
    const out = [];
    for (const doc of Array.isArray(list) ? list : []) {
      const num = doc?.[numberField] ? String(doc[numberField]).trim() : null;
      const key = num ? `${numberField}:${num}` : `_id:${String(doc?._id)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(doc);
    }
    return out;
  }

  const uniqueGrns = dedupeByNumber(grns, "grnNumber");
  const uniqueInvoices = dedupeByNumber(invoices, "invoiceNumber");

  const reasons = [];
  const reasonSet = new Set();

  function addReasonOnce(r) {
    const key = `${r.code}|${r.itemMatchKey || ""}|${r.expected ?? ""}|${r.actual ?? ""}`;
    if (reasonSet.has(key)) return;
    reasonSet.add(key);
    addReason(reasons, r);
  }

  const poLatest = pos[0] || null;
  if (pos.length > 1) {
    addReasonOnce({ code: "duplicate_po", message: `Found ${pos.length} POs for ${poNumber}` });
  }

  const hasAllDocs = Boolean(poLatest) && uniqueGrns.length > 0 && uniqueInvoices.length > 0;

  const { skuToKey, descToKey, poQtyByKey } = buildPoIndex(poLatest?.items);
  const grnQtyByKey = new Map(); // canonicalKey -> qty
  const invoiceQtyByKey = new Map(); // canonicalKey -> qty
  const missingInPo = new Set(); // identifiers for reason

  // Sum GRN quantities mapped to PO keys
  for (const g of uniqueGrns) {
    for (const it of Array.isArray(g.items) ? g.items : []) {
      const qty = Number(it?.receivedQuantity);
      if (!Number.isFinite(qty)) continue;
      const key = poLatest ? mapItemToPoKey({ item: it, skuToKey, descToKey }) : null;
      if (!poLatest) continue;
      if (!key) {
        const ident = it?.normalizedDescription || it?.sku || it?.docItemCode || "UNKNOWN";
        missingInPo.add(String(ident));
        continue;
      }
      grnQtyByKey.set(key, (grnQtyByKey.get(key) || 0) + qty);
    }
  }

  // Sum invoice quantities mapped to PO keys
  for (const inv of uniqueInvoices) {
    for (const it of Array.isArray(inv.items) ? inv.items : []) {
      const qty = Number(it?.quantity);
      if (!Number.isFinite(qty)) continue;
      const key = poLatest ? mapItemToPoKey({ item: it, skuToKey, descToKey }) : null;
      if (!poLatest) continue;
      if (!key) {
        // Prefer description for cross-doc debugging; docItemCode is invoice-local and not comparable to PO.
        const ident = it?.normalizedDescription || it?.sku || it?.docItemCode || "UNKNOWN";
        missingInPo.add(String(ident));
        continue;
      }
      invoiceQtyByKey.set(key, (invoiceQtyByKey.get(key) || 0) + qty);
    }
  }

  // Out-of-order hardening:
  // Only mark missing-in-PO when a PO exists (otherwise it's just "insufficient_documents").
  if (poLatest) {
    for (const ident of missingInPo) {
      addReasonOnce({ code: "item_missing_in_po", itemMatchKey: ident });
    }
  }

  // Quantity rules (item-level)
  if (poLatest && uniqueGrns.length > 0) {
    for (const [key, grnQty] of grnQtyByKey.entries()) {
      const poQty = poQtyByKey.get(key) || 0;
      if (grnQty > poQty) {
        addReasonOnce({ code: "grn_qty_exceeds_po_qty", itemMatchKey: key, expected: poQty, actual: grnQty });
      }
    }
  }

  if (poLatest && uniqueInvoices.length > 0) {
    for (const [key, invQty] of invoiceQtyByKey.entries()) {
      const poQty = poQtyByKey.get(key) || 0;
      if (invQty > poQty) {
        addReasonOnce({ code: "invoice_qty_exceeds_po_qty", itemMatchKey: key, expected: poQty, actual: invQty });
      }
    }
  }

  if (uniqueGrns.length > 0 && uniqueInvoices.length > 0) {
    for (const [key, invQty] of invoiceQtyByKey.entries()) {
      const grnQty = grnQtyByKey.get(key) || 0;
      if (invQty > grnQty) {
        addReasonOnce({ code: "invoice_qty_exceeds_grn_qty", itemMatchKey: key, expected: grnQty, actual: invQty });
      }
    }
  }

  // Date rule: invoiceDate must not be after poDate
  if (poLatest?.poDate) {
    const poDate = new Date(poLatest.poDate);
    const anyInvoiceAfterPo = uniqueInvoices.some((i) => i?.invoiceDate && new Date(i.invoiceDate) > poDate);
    if (anyInvoiceAfterPo) {
      addReasonOnce({ code: "invoice_date_after_po_date" });
    }
  }

  const status = computeStatus({ hasAllDocs, reasons, poQtyByKey, grnQtyByKey, invoiceQtyByKey });

  const linked = {
    documentIds: documents.map((d) => d._id),
    purchaseOrderIds: poLatest ? [poLatest._id] : [],
    grnIds: uniqueGrns.map((g) => g._id),
    invoiceIds: uniqueInvoices.map((i) => i._id)
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


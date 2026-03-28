const { asyncHandler } = require("../../utils/asyncHandler");
const { AppError } = require("../../utils/appError");

const MatchResult = require("../../models/matchResult.model");
const PurchaseOrder = require("../../models/po.model");
const GRN = require("../../models/grn.model");
const Invoice = require("../../models/invoice.model");
const Document = require("../../models/document.model");

const { recomputeMatchForPoNumber } = require("./match.service");

const getMatchByPoNumber = asyncHandler(async (req, res) => {
  const poNumber = String(req.params.poNumber || "").trim();
  const includeDebug = String(req.query.includeDebug || "false").toLowerCase() === "true";

  if (!poNumber) {
    throw new AppError("poNumber is required", 400);
  }

  // Ensure a result exists (out-of-order safe) even if called before any upload recompute.
  let result = await MatchResult.findOne({ poNumber }).lean();
  if (!result) {
    result = (await recomputeMatchForPoNumber(poNumber)).toObject?.() || (await MatchResult.findOne({ poNumber }).lean());
  }

  if (!result) {
    throw new AppError("Match result not found", 404);
  }

  const [po, grns, invoices, documents] = await Promise.all([
    PurchaseOrder.findOne({ poNumber }).sort({ createdAt: -1 }).lean(),
    GRN.find({ poNumber }).sort({ createdAt: -1 }).lean(),
    Invoice.find({ poNumber }).sort({ createdAt: -1 }).lean(),
    Document.find({ "extracted.poNumber": poNumber }).sort({ createdAt: -1 }).lean()
  ]);

  if (!includeDebug) delete result.debug;

  res.status(200).json({
    message: "OK",
    data: {
      poNumber,
      status: result.status,
      reasons: result.reasons || [],
      linked: {
        documents,
        purchaseOrder: po,
        grns,
        invoices
      },
      computedAt: result.computedAt
    }
  });
});

module.exports = { getMatchByPoNumber };


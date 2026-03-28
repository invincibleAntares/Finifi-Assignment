const mongoose = require("mongoose");

const ReasonSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    message: { type: String },
    itemMatchKey: { type: String },
    expected: { type: Number },
    actual: { type: Number }
  },
  { _id: false }
);

const MatchResultSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ["matched", "partially_matched", "mismatch", "insufficient_documents"],
      default: "insufficient_documents"
    },
    reasons: { type: [ReasonSchema], default: [] },
    linked: {
      documentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
      purchaseOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" }],
      grnIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "GRN" }],
      invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }]
    },
    debug: { type: mongoose.Schema.Types.Mixed },
    computedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MatchResult", MatchResultSchema);


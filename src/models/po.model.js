const mongoose = require("mongoose");

const POItemSchema = new mongoose.Schema(
  {
    matchKey: { type: String, required: true, index: true },
    sku: { type: String },
    description: { type: String },
    quantity: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const PurchaseOrderSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    poNumber: { type: String, required: true, index: true },
    poDate: { type: Date },
    vendorName: { type: String },
    items: { type: [POItemSchema], default: [] }
  },
  { timestamps: true }
);

// Not unique on purpose: if duplicates arrive, matching can flag `duplicate_po`.
PurchaseOrderSchema.index({ poNumber: 1, createdAt: -1 });

module.exports = mongoose.model("PurchaseOrder", PurchaseOrderSchema);


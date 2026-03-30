const mongoose = require("mongoose");

const GRNItemSchema = new mongoose.Schema(
  {
    sku: { type: String, index: true },
    docItemCode: { type: String },
    rawDescription: { type: String },
    cleanDescriptionFromGemini: { type: String },
    normalizedDescription: { type: String, required: true, index: true },
    receivedQuantity: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const GRNSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    poNumber: { type: String, required: true, index: true },
    grnNumber: { type: String, index: true },
    grnDate: { type: Date },
    items: { type: [GRNItemSchema], default: [] }
  },
  { timestamps: true }
);

GRNSchema.index({ poNumber: 1, grnNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("GRN", GRNSchema);


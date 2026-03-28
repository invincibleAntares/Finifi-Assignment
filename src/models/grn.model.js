const mongoose = require("mongoose");

const GRNItemSchema = new mongoose.Schema(
  {
    matchKey: { type: String, required: true, index: true },
    sku: { type: String },
    description: { type: String },
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

GRNSchema.index({ poNumber: 1, grnNumber: 1 });

module.exports = mongoose.model("GRN", GRNSchema);


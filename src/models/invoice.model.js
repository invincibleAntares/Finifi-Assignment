const mongoose = require("mongoose");

const InvoiceItemSchema = new mongoose.Schema(
  {
    sku: { type: String, index: true },
    docItemCode: { type: String },
    rawDescription: { type: String },
    cleanDescriptionFromGemini: { type: String },
    normalizedDescription: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    poNumber: { type: String, required: true, index: true },
    invoiceNumber: { type: String, index: true },
    invoiceDate: { type: Date },
    items: { type: [InvoiceItemSchema], default: [] }
  },
  { timestamps: true }
);

InvoiceSchema.index({ poNumber: 1, invoiceNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Invoice", InvoiceSchema);


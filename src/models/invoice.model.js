const mongoose = require("mongoose");

const InvoiceItemSchema = new mongoose.Schema(
  {
    matchKey: { type: String, required: true, index: true },
    sku: { type: String },
    description: { type: String },
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

InvoiceSchema.index({ poNumber: 1, invoiceNumber: 1 });

module.exports = mongoose.model("Invoice", InvoiceSchema);


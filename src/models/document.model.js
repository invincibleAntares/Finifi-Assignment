const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true }
  },
  { _id: false }
);

const DocumentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      required: true,
      enum: ["po", "grn", "invoice"]
    },
    status: {
      type: String,
      required: true,
      enum: ["uploaded", "parsed", "parse_failed"],
      default: "uploaded"
    },
    file: { type: FileSchema, required: true },

    extracted: {
      poNumber: { type: String, index: true },
      vendorName: { type: String },

      poNumberSource: { type: String }, // optional: where we got poNumber from (debug)

      poDate: { type: Date },
      grnNumber: { type: String },
      grnDate: { type: Date },
      invoiceNumber: { type: String },
      invoiceDate: { type: Date }
    },

    parsed: {
      raw: { type: mongoose.Schema.Types.Mixed },
      normalized: { type: mongoose.Schema.Types.Mixed }
    },

    parseError: { type: String }
  },
  { timestamps: true }
);

DocumentSchema.index({ "extracted.poNumber": 1, documentType: 1 });

module.exports = mongoose.model("Document", DocumentSchema);


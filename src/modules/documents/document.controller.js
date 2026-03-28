const { asyncHandler } = require("../../utils/asyncHandler");
const { AppError } = require("../../utils/appError");
const { createUploadedDocument } = require("./document.service");
const { parsePdfWithGemini } = require("../parsing/parsing.service");
const Document = require("../../models/document.model");
const { storeStructuredRecord } = require("./document.storage");
const mongoose = require("mongoose");

const uploadDocument = asyncHandler(async (req, res) => {
  const { documentType } = req.body;

  if (!documentType || !["po", "grn", "invoice"].includes(documentType)) {
    throw new AppError("documentType must be one of: po, grn, invoice", 400);
  }

  if (!req.file) {
    throw new AppError("file is required (PDF)", 400);
  }

  const doc = await createUploadedDocument({ documentType, file: req.file });

  // Step 4: parse with Gemini and store on Document
  try {
    const parsed = await parsePdfWithGemini({
      documentType,
      filePath: doc.file.path
    });

    // Require poNumber across all document types for linking
    const poNumber = parsed?.extracted?.poNumber || parsed?.normalized?.poNumber;
    if (!poNumber) {
      throw new Error("Could not extract poNumber from document");
    }

    await Document.findByIdAndUpdate(doc._id, {
      status: "parsed",
      extracted: {
        ...(parsed.extracted || {}),
        poNumber
      },
      parsed: {
        raw: parsed.raw,
        normalized: parsed.normalized
      },
      parseError: null
    });

    // Step 5: store structured document into its own collection
    await storeStructuredRecord({
      documentType,
      documentId: doc._id,
      normalized: parsed.normalized
    });
  } catch (err) {
    await Document.findByIdAndUpdate(doc._id, {
      status: "parse_failed",
      parseError: err?.message ? String(err.message) : "Parse failed"
    });
  }

  const updated = await Document.findById(doc._id).lean();

  res.status(201).json({
    message: "Uploaded",
    data: {
      documentId: updated._id,
      documentType: updated.documentType,
      status: updated.status,
      poNumber: updated.extracted?.poNumber || null
    }
  });
});

const getDocumentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const includeRaw = String(req.query.includeRaw || "false").toLowerCase() === "true";

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid document id", 400);
  }

  const doc = await Document.findById(id).lean();
  if (!doc) {
    throw new AppError("Document not found", 404);
  }

  if (!includeRaw && doc.parsed) {
    doc.parsed = { normalized: doc.parsed.normalized };
  }

  res.status(200).json({
    message: "OK",
    data: doc
  });
});

module.exports = { uploadDocument, getDocumentById };


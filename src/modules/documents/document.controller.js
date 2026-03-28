const { asyncHandler } = require("../../utils/asyncHandler");
const { AppError } = require("../../utils/appError");
const { createUploadedDocument } = require("./document.service");
const { parsePdfWithGemini } = require("../parsing/parsing.service");
const Document = require("../../models/document.model");

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

module.exports = { uploadDocument };


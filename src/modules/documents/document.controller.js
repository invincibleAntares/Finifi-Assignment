const { asyncHandler } = require("../../utils/asyncHandler");
const { AppError } = require("../../utils/appError");
const { createUploadedDocument } = require("./document.service");

const uploadDocument = asyncHandler(async (req, res) => {
  const { documentType } = req.body;

  if (!documentType || !["po", "grn", "invoice"].includes(documentType)) {
    throw new AppError("documentType must be one of: po, grn, invoice", 400);
  }

  if (!req.file) {
    throw new AppError("file is required (PDF)", 400);
  }

  const doc = await createUploadedDocument({ documentType, file: req.file });

  res.status(201).json({
    message: "Uploaded",
    data: {
      documentId: doc._id,
      documentType: doc.documentType,
      status: doc.status
    }
  });
});

module.exports = { uploadDocument };


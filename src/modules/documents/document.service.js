const fs = require("fs");
const path = require("path");

const Document = require("../../models/document.model");
const { ensureDir } = require("./document.upload");

async function createUploadedDocument({ documentType, file }) {
  const finalDir = path.join(process.cwd(), "uploads", documentType);
  ensureDir(finalDir);

  const originalName = file.originalname || "document.pdf";
  const ext = path.extname(originalName || "").toLowerCase() || ".pdf";
  const safeExt = ext && ext.length <= 10 ? ext : ".pdf";

  const finalFileName = `${path.parse(file.filename).name}${safeExt}`;
  const finalPath = path.join(finalDir, finalFileName);

  // Move from uploads/tmp to uploads/<type>
  fs.renameSync(file.path, finalPath);

  return await Document.create({
    documentType,
    status: "uploaded",
    file: {
      originalName: originalName,
      mimeType: file.mimetype || "application/pdf",
      size: file.size,
      path: finalPath
    }
  });
}

module.exports = { createUploadedDocument };


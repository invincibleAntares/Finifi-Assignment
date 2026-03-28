const fs = require("fs");
const path = require("path");
const multer = require("multer");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

const tmpUploadDir = path.join(process.cwd(), "uploads", "tmp");
ensureDir(tmpUploadDir);

const storage = multer.diskStorage({
  destination: function destination(req, file, cb) {
    cb(null, tmpUploadDir);
  },
  filename: function filename(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext && ext.length <= 10 ? ext : "";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${safeExt}`);
  }
});

function fileFilter(req, file, cb) {
  const isPdfMime = file.mimetype === "application/pdf";
  const isPdfExt = path.extname(file.originalname || "").toLowerCase() === ".pdf";
  if (isPdfMime || isPdfExt) return cb(null, true);
  return cb(new Error("Only PDF files are allowed"));
}

const uploadSinglePdf = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
}).single("file");

module.exports = { uploadSinglePdf, ensureDir };


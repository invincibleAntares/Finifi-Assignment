const express = require("express");

const { uploadSinglePdf } = require("./document.upload");
const { uploadDocument, getDocumentById } = require("./document.controller");

const router = express.Router();

router.post("/upload", uploadSinglePdf, uploadDocument);
router.get("/:id", getDocumentById);

module.exports = router;


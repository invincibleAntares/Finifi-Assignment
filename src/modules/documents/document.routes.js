const express = require("express");

const { uploadSinglePdf } = require("./document.upload");
const { uploadDocument } = require("./document.controller");

const router = express.Router();

router.post("/upload", uploadSinglePdf, uploadDocument);

module.exports = router;


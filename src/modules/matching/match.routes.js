const express = require("express");

const { getMatchByPoNumber } = require("./match.controller");

const router = express.Router();

router.get("/:poNumber", getMatchByPoNumber);

module.exports = router;


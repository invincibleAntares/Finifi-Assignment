const express = require("express");
const cors = require("cors");

const documentRoutes = require("./modules/documents/document.routes");
const { notFound } = require("./middlewares/notFound.middleware");
const { errorHandler } = require("./middlewares/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running"
  });
});

app.use("/documents", documentRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
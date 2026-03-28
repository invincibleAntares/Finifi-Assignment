const fs = require("fs");

const { getGeminiModel } = require("../../config/gemini");
const { buildPrompt } = require("./parsing.prompts");
const { extractJsonObject } = require("./parsing.utils");
const { mapGeminiJsonToNormalized } = require("./parsing.mapper");

async function parsePdfWithGemini({ documentType, filePath }) {
  const pdfBuffer = fs.readFileSync(filePath);
  const base64 = pdfBuffer.toString("base64");

  const model = getGeminiModel();
  const prompt = buildPrompt({ documentType });

  const result = await model.generateContent([
    { text: prompt },
    { inlineData: { data: base64, mimeType: "application/pdf" } }
  ]);

  const text = result?.response?.text?.() ?? "";
  const jsonText = extractJsonObject(text);
  const raw = JSON.parse(jsonText);

  const mapped = mapGeminiJsonToNormalized({ documentType, geminiJson: raw });
  return { raw, ...mapped };
}

module.exports = { parsePdfWithGemini };


const { GoogleGenerativeAI } = require("@google/generative-ai");

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

  if (!apiKey || String(apiKey).trim() === "") {
    throw new Error("Missing required env var: GEMINI_API_KEY");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0
    }
  });
}

module.exports = { getGeminiModel };


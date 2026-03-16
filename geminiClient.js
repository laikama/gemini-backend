import { GoogleGenAI, createPartFromUri, createUserContent } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is required");
}

const client = new GoogleGenAI({ apiKey });

export async function transcribeWithGemini({ filePath, mimeType, prompt, model }) {
  const file = await client.files.upload({
    file: filePath,
    config: { mimeType },
  });

  const contents = createUserContent([
    createPartFromUri(file.uri, file.mimeType || mimeType),
    prompt,
  ]);

  const response = await client.models.generateContent({
    model,
    contents,
  });

  const fallbackText = Array.isArray(response?.candidates)
    ? response.candidates
        .flatMap((candidate) => candidate?.content?.parts || [])
        .map((part) => part?.text || "")
        .join("")
    : "";

  const text = response?.text || fallbackText;
  if (!text) {
    throw new Error("Gemini response contained no text content");
  }

  return {
    text,
    file,
  };
}

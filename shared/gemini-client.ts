import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY as string
);

export async function callGemini(systemPrompt: string, userMessage: string): Promise<string> 
{
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-lite-latest",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userMessage);
  const text = result.response.text();

  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  return text;
}

export async function callGeminiForJSON<T>(systemPrompt: string, userMessage: string): Promise<T> 
{
  const rawResponse = await callGemini(systemPrompt, userMessage);

  const cleaned = rawResponse
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error("Raw Gemini response that failed to parse:", rawResponse);
    throw new Error(`Gemini returned invalid JSON: ${err}`);
  }
}
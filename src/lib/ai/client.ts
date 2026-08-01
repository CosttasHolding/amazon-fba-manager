import OpenAI from "openai";

let _xai: OpenAI | null = null;

export function getXAIClient(): OpenAI {
  if (!_xai) {
    _xai = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: "https://api.x.ai/v1",
    });
  }
  return _xai;
}

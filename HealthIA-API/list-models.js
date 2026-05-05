import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function main() {
  const pager = await ai.models.list({
    config: {
      pageSize: 100,
    },
  });

  for await (const model of pager) {
    console.log(model.name);
    console.log("  displayName:", model.displayName);
    console.log("  supportedActions:", model.supportedActions);
    console.log("--------------------------------------------------");
  }
}

main().catch(console.error);
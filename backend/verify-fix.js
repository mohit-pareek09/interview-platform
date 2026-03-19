import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";
dotenv.config();

const HF_TOKEN = process.env.HF_TOKEN;
const MODEL = process.env.HF_MODEL;

console.log("Using model:", MODEL);
const hf = new HfInference(HF_TOKEN);

async function test() {
  try {
    const res = await hf.chatCompletion({
      model: MODEL,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 10,
    });
    console.log("✅ Success:", res.choices[0].message.content);
  } catch (e) {
    console.error("❌ Failed:", e.message);
  }
}

test();

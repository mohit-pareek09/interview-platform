import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";
dotenv.config();

const HF_TOKEN = process.env.HF_TOKEN;
const MODELS = [
  "HuggingFaceH4/zephyr-7b-beta",
  "Qwen/Qwen2.5-7B-Instruct"
];

const hf = new HfInference(HF_TOKEN);

async function test() {
  for (const model of MODELS) {
    try {
      console.log(`\nTesting model: ${model}`);
      const res = await hf.chatCompletion({
        model: model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      });
      console.log(`✅ Success with ${model}:`, res.choices[0].message.content);
    } catch (e) {
      console.error(`❌ Failed with ${model}:`, e.message);
    }
  }
}

test();

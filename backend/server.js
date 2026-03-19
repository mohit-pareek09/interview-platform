import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { HfInference } from "@huggingface/inference";
import { EdgeTTS } from "node-edge-tts";
import { PDFParse } from "pdf-parse";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "placeholder-key";
const supabase = createClient(supabaseUrl, supabaseKey);

// HuggingFace LLM Setup
const HF_TOKEN = process.env.HF_TOKEN;
const MODEL = process.env.HF_MODEL || "Qwen/Qwen2.5-7B-Instruct";

if (!HF_TOKEN || HF_TOKEN === "YOUR_HF_TOKEN") {
  console.warn("⚠️  WARNING: HF_TOKEN is not set in .env! AI responses will fail. Get a free token from https://huggingface.co/settings/tokens");
}

const hf = new HfInference(HF_TOKEN);

// Helper to call HF chat — explicitly use "hf-inference" provider (required in v4+)
async function chatWithHF(messages, maxTokens = 500) {
  const response = await hf.chatCompletion({
    model: MODEL,
    messages,
    max_tokens: maxTokens,
  });
  return response.choices[0].message.content;
}

const upload = multer({ storage: multer.memoryStorage() });

app.get("/", (req, res) => {
  res.send({ status: "ok", message: "AI Interview Simulator API" });
});

// ─── Resume Upload & Parse ──────────────────────────────────────────────────
// Flow: Upload PDF → Extract text → Return to frontend → Frontend passes to LLM
app.post("/api/upload-resume", upload.single("resume"), async (req, res) => {
  try {
    console.log("File received:", req.file ? req.file.originalname : "none");
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    console.log("Starting PDF parse...");
    const parser = new PDFParse({ data: req.file.buffer });
    const result = await parser.getText();
    const text = result.text;
    console.log("PDF parse complete. Text length:", text ? text.length : 0);

    console.log(text);

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Could not extract text from PDF. Is it a scanned image PDF?" });
    }

    res.json({ success: true, text });



  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to parse resume: " + error.message });
  }
});

// ─── Start Interview (first question, resume-aware) ─────────────────────────
app.post("/api/interview/start", async (req, res) => {
  const { role, company, type, resumeText } = req.body;

  const interviewType = type === "Behavioral" ? "HR / Behavioral" : "Technical";
  const prompt = `You are an expert ${interviewType} interviewer at ${company || "a top tech company"}.
You are interviewing a candidate for the role of ${role || "Software Engineer"}.

Here is their resume:
${(resumeText || "").substring(0, 3000)}

Ask the very first interview question. Base it on the candidate's actual resume above. Keep it concise, natural, and conversational. Do not use bullet points or bold formatting — just plain spoken text.`;

  try {
    const aiText = await chatWithHF([{ role: "user", content: prompt }]);
    res.json({ text: aiText });
  } catch (error) {
    console.error("Start interview error:", error);
    res.status(500).json({ error: "Failed to start interview: " + error.message });
  }
});

// ─── Interview Chat (resume-aware follow-up Q&A) ────────────────────────────
app.post("/api/interview/chat", async (req, res) => {
  const { messages, role, company, type, resumeText } = req.body;

  const interviewType = type === "Behavioral" ? "HR / Behavioral" : "Technical";
  const systemPrompt = `You are an expert ${interviewType} interviewer at ${company || "a top tech company"} interviewing for ${role || "Software Engineer"}.

Candidate's resume summary:
${(resumeText || "").substring(0, 2000)}

Instructions:
- Ask one focused follow-up question at a time based on their previous answer AND their resume.
- Keep responses to 1-3 sentences.
- Do NOT use bullet points or bold formatting — plain conversational text only.
- Probe deeper into resume skills and past experiences.`;

  try {
    const aiText = await chatWithHF([
      { role: "system", content: systemPrompt },
      ...messages,
    ]);
    res.json({ text: aiText });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Chat failed: " + error.message });
  }
});

// ─── Code Submit (Technical Interview) ─────────────────────────────────────
app.post("/api/interview/code-submit", async (req, res) => {
  const { code, spokenAnswer, question, role, resumeText } = req.body;

  const prompt = `You are a senior technical interviewer for a ${role || "Software Engineer"} position.

The problem asked was: "${question || "Solve the given coding problem"}"

The candidate's spoken explanation:
"${spokenAnswer || "(none provided)"}"

The candidate's code:
\`\`\`
${code || "(no code written)"}
\`\`\`

Evaluate the solution in 3-4 sentences:
1. Is the logic correct?
2. What is the time/space complexity?
3. One specific improvement suggestion.
Keep it constructive and concise. Plain text only, no markdown formatting.`;

  try {
    const aiText = await chatWithHF([{ role: "user", content: prompt }]);
    res.json({ feedback: aiText });
  } catch (error) {
    console.error("Code submit error:", error);
    res.status(500).json({ error: "Code evaluation failed: " + error.message });
  }
});

// ─── Generate Coding Question ──────────────────────────────────────────────
app.post("/api/interview/generate-coding-question", async (req, res) => {
  const { role, skills, resumeText } = req.body;

  const prompt = `You are a senior technical interviewer for a ${role || "Software Engineer"} position.
The candidate has specified expertise in: ${skills || "general software engineering"}.

CRITICAL: You MUST generate ONE specific coding challenge that is PRIMARILY focused on the following skill: ${skills}. 
Do not deviate from this topic. 

Include:
1. "question": A clear problem statement based on ${skills}.
2. "template": A starting code template (in Python or Javascript as appropriate).
3. "language": The language for the template.

Format your response as a JSON object with these three keys. Do not include any other text.`;

  try {
    const aiText = await chatWithHF([{ role: "user", content: prompt }]);
    // Extract JSON if AI includes markdown code blocks
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : aiText;
    const result = JSON.parse(jsonStr);
    res.json(result);
  } catch (error) {
    console.error("Generate question error:", error);
    res.status(500).json({ error: "Failed to generate coding question" });
  }
});

// ─── Evaluate Coding Challenge ─────────────────────────────────────────────
app.post("/api/interview/evaluate-coding-challenge", async (req, res) => {
  const { code, question, template, attempts, role, type } = req.body;

  let prompt = "";
  if (type === "hint") {
    prompt = `You are a senior technical interviewer.
Problem: "${question}"
Candidate's current code:
\`\`\`
${code}
\`\`\`
Task: Provide a very brief, helpful hint that guides them towards the correct logic without giving away the full solution. 
Format: JSON object with "hint" key.`;
  } else {
    prompt = `You are a senior technical interviewer for a ${role || "Software Engineer"} position.
PROBLEM: "${question}"

ORIGINAL TEMPLATE PROVIDED:
\`\`\`
${template || "(no template)"}
\`\`\`

CANDIDATE'S SUBMISSION:
\`\`\`
${code}
\`\`\`

TASK: Evaluate if the candidate has actually IMPLEMENTED a solution.
1. COMPARE the submission with the original template.
2. If the submission is identical or nearly identical to the template (only comments changed, or simple "return" added), you MUST set "isSolved" to false and "status" to "No Implementation Provided".
3. Evaluate the LOGIC of the implementation.

Format your response as a JSON object with these keys: 
"isSolved" (boolean: true ONLY if logic is correct AND significantly different from template), 
"status" (string: "Logic and Code Correct", "Logic Correct but Code has issues", "Logic Incorrect / Not Implemented"),
"logicFeedback" (string), 
"optimizationSuggestions" (string).`;
  }

  // Safety Check: If code is just placeholders, reject immediately
  const cleanCode = code.replace(/#.*$/gm, "").trim();
  const isTemplateOnly = cleanCode.split('\n').every(line => {
    const l = line.trim();
    return l === "" || l.startsWith("def ") || l === "pass" || l === "return" || l.startsWith("class ");
  });

  if (isTemplateOnly && code.length < 250) {
    return res.json({
      isSolved: false,
      status: "No Implementation Provided",
      logicFeedback: "You have not implemented any logic in the function body. Please write your solution before submitting.",
      optimizationSuggestions: "Start by defining the core algorithm."
    });
  }

  try {
    console.log("Evaluating coding challenge...");
    const aiText = await chatWithHF([{ role: "user", content: prompt }]);
    console.log("AI Raw Text:", aiText);

    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : aiText;

    try {
      const result = JSON.parse(jsonStr);
      console.log("Parsed AI result:", result);

      // Normalize keys just in case AI uses snake_case
      const normalized = {
        isSolved: result.isSolved ?? result.is_solved ?? false,
        status: result.status ?? result.evaluation ?? "Evaluation complete",
        logicFeedback: result.logicFeedback ?? result.logic_feedback ?? result.feedback ?? "No logic feedback provided",
        optimizationSuggestions: result.optimizationSuggestions ?? result.optimization_suggestions ?? result.optimization ?? "No optimization suggestions provided",
        hint: result.hint ?? ""
      };

      res.json(normalized);
    } catch (parseErr) {
      console.error("JSON Parse Error:", parseErr);
      // Fallback if AI fails to return valid JSON
      res.json({
        isSolved: false,
        status: "Logic Evaluation",
        logicFeedback: aiText,
        optimizationSuggestions: "Check for standard patterns.",
        hint: aiText.substring(0, 100)
      });
    }
  } catch (error) {
    console.error("Evaluate challenge error:", error);
    res.status(500).json({ error: "Failed to evaluate challenge" });
  }
});

// ─── Generate Interview Feedback ───────────────────────────────────────────
app.post("/api/interview/feedback", async (req, res) => {
  const { messages, role, company, type } = req.body;

  const conversationText = messages
    .map((m) => `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.content}`)
    .join("\n");

  const prompt = `You are a senior hiring manager. 
Analyze the following ${type} interview for a ${role} position at ${company}.
Conversation History:
${conversationText}

Task: Evaluate the candidate's performance and provide ONLY numerical scores (0 to 100).
1. Overall Score: General suitability for the role.
2. Technical Score: Correctness and depth of answers.
3. Communication Score: Clarity and confidence.

Return ONLY a JSON object:
{
  "overallScore": number,
  "technicalScore": number,
  "communicationScore": number
}`;

  try {
    const aiText = await chatWithHF([{ role: "user", content: prompt }]);
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : aiText;
    const result = JSON.parse(jsonStr);

    res.json({
      overall: Math.min(100, Math.max(0, result.overallScore ?? result.overall ?? 50)),
      technical: Math.min(100, Math.max(0, result.technicalScore ?? result.technical ?? 50)),
      communication: Math.min(100, Math.max(0, result.communicationScore ?? result.communication ?? 50)),
    });
  } catch (error) {
    console.error("Feedback error:", error);
    res.json({ overall: 70, technical: 70, communication: 70 }); // Fallback
  }
});

// ─── TTS Endpoint (using browser SpeechSynthesis on frontend) ──────────────
app.post("/api/interview/tts", async (req, res) => {
  // TTS is handled on the frontend via Web Speech API (SpeechSynthesisUtterance)
  // This endpoint is kept as a no-op for compatibility
  res.json({ status: "use-browser-tts" });
});

// ─── Socket.io for Group Discussion ─────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("User connected to socket:", socket.id);

  socket.on("join_gd", ({ roomId, topic }) => {
    socket.join(roomId);

    // Moderator opens the discussion
    setTimeout(() => {
      io.to(roomId).emit("gd_message", {
        id: Date.now().toString(),
        speaker: "Moderator AI",
        text: `Welcome everyone. Today's topic is "${topic || "The Impact of AI on the Job Market"}". Let's begin. Candidate, please share your opening thoughts.`,
        role: "moderator",
      });
    }, 1500);
  });

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  socket.on("send_gd_message", async ({ roomId, text, speaker, topic }) => {
    // Echo the user's message
    io.to(roomId).emit("gd_message", {
      id: Date.now().toString(),
      speaker,
      text,
      role: "user",
    });

    const gdTopic = topic || "The Impact of AI on the Job Market";

    // AI Student 1 — analytical, data-driven
    setTimeout(async () => {
      try {
        const s1Text = await chatWithHF([
          {
            role: "system",
            content: `You are "Alex", an analytical and data-driven student in a group discussion about "${gdTopic}". Respond in 1-2 sentences to what was just said. Be intelligent, cite trends or data when possible. Plain text only.`,
          },
          { role: "user", content: text },
        ], 150);

        io.to(roomId).emit("gd_message", {
          id: (Date.now() + 1).toString(),
          speaker: "AI Candidate 1 (Alex)",
          text: s1Text,
          role: "student",
        });
      } catch (e) {
        console.error("GD student 1 error:", e.message);
        io.to(roomId).emit("gd_message", {
          id: (Date.now() + 1).toString(),
          speaker: "AI Candidate 1 (Alex)",
          text: "That's a great point. Studies show AI is expected to automate 30% of tasks by 2030, but new roles will emerge in parallel.",
          role: "student",
        });
      }
    }, 3000);

    // AI Student 2 — creative, optimistic, different angle
    setTimeout(async () => {
      try {
        const s2Text = await chatWithHF([
          {
            role: "system",
            content: `You are "Sam", a creative and optimistic student in a group discussion about "${gdTopic}". Respond in 1-2 sentences with a different perspective from what was just said. Be forward-thinking and human-centered. Plain text only.`,
          },
          { role: "user", content: text },
        ], 150);

        io.to(roomId).emit("gd_message", {
          id: (Date.now() + 2).toString(),
          speaker: "AI Candidate 2 (Sam)",
          text: s2Text,
          role: "student",
        });
      } catch (e) {
        console.error("GD student 2 error:", e.message);
        io.to(roomId).emit("gd_message", {
          id: (Date.now() + 2).toString(),
          speaker: "AI Candidate 2 (Sam)",
          text: "I'd add that AI can actually free humans to do more creative work. The key is upskilling and embracing change with optimism.",
          role: "student",
        });
      }
    }, 7000);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

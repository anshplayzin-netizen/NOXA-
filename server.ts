import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization for OpenAI to prevent crash on startup if key is missing
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiClient = new OpenAI({ apiKey: key });
  }
  return openaiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      
      // Convert Gemini history format to OpenAI format
      const openAiMessages = history.map((msg: any) => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.parts[0].text
      }));

      // Add system prompt and the latest user message
      openAiMessages.unshift({
        role: "system",
        content: "You are NOXA, a helpful AI assistant. Keep your responses concise and friendly, as they will be read aloud via text-to-speech."
      });
      openAiMessages.push({ role: "user", content: message });

      // Call OpenAI API matching user's requested Python structure
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Equivalent to GPT-4 Mini that was requested
        messages: openAiMessages,
      });

      res.json({ text: response.choices[0].message?.content || "I'm sorry, I couldn't generate a response." });
    } catch (error: any) {
      console.error("OpenAI Error:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

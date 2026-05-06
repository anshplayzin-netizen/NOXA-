import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { OpenAI } from "openai";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization for OpenAI to prevent crash on startup if key is missing
let openaiClient: OpenAI | null = null;
let stripeClient: Stripe | null = null;

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

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { priceId, planName } = req.body;
      
      // Check if Stripe is configured
      if (!process.env.STRIPE_SECRET_KEY) {
        console.warn("STRIPE_SECRET_KEY is missing. Returning a demo checkout URL.");
        // Return a mock URL for demo purposes if the secret is missing
        return res.json({ 
          url: `${req.headers.origin}?success=true&demo=true`,
          isDemo: true,
          message: "Stripe key is missing. This is a simulated checkout for demo purposes." 
        });
      }

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        // Enabling automatic payment methods for Google Pay, Apple Pay, etc.
        automatic_payment_methods: {
          enabled: true,
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: planName || "NOXA Pro Subscription",
              },
              unit_amount: priceId === "pro" ? 1900 : 4900, // $19 or $49
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.headers.origin}?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}?canceled=true`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Checkout Error:", error);
      res.status(500).json({ error: error.message });
    }
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

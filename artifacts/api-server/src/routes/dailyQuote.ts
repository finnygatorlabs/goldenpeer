import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { dailyQuoteCacheTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

const FALLBACK_QUOTES = [
  { text: "If you are going through hell, keep going.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "One day or day one. You decide.", author: "Unknown" },
  { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey" },
];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function generateQuoteWithAI(logger: any): Promise<{ text: string; author: string } | null> {
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  if (!baseUrl || !apiKey) {
    logger.warn("AI integration env vars not set, using fallback");
    return null;
  }

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        max_completion_tokens: 200,
        messages: [
          {
            role: "system",
            content: `You are a daily quote curator for seniors (age 65+). Return exactly one short, uplifting motivational or inspirational quote. The quote text must be under 65 characters. Choose from a wide variety of famous thinkers, leaders, authors, athletes, and historical figures across all eras and cultures. Never repeat the same quote twice. Respond in JSON: {"text":"...","author":"..."}`,
          },
          {
            role: "user",
            content: `Today is ${todayStr()}. Give me a unique inspirational quote for today. Make it different from common well-known quotes. Keep the text under 65 characters.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, "AI quote generation failed");
      return null;
    }

    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const cleaned = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.text && parsed.author) {
      const trimmedText = parsed.text.length > 65 ? parsed.text.slice(0, 62) + "..." : parsed.text;
      return { text: trimmedText, author: parsed.author };
    }
    return null;
  } catch (err) {
    logger.warn({ err }, "AI quote generation error");
    return null;
  }
}

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const today = todayStr();

    const [cached] = await db
      .select()
      .from(dailyQuoteCacheTable)
      .where(eq(dailyQuoteCacheTable.quote_date, today))
      .limit(1);

    if (cached) {
      res.json({ text: cached.text, author: cached.author, source: "ai" });
      return;
    }

    const aiQuote = await generateQuoteWithAI(req.log);

    if (aiQuote) {
      await db
        .insert(dailyQuoteCacheTable)
        .values({ quote_date: today, text: aiQuote.text, author: aiQuote.author })
        .onConflictDoNothing();

      res.json({ text: aiQuote.text, author: aiQuote.author, source: "ai" });
      return;
    }

    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const fallback = FALLBACK_QUOTES[dayOfYear % FALLBACK_QUOTES.length];
    res.json({ text: fallback.text, author: fallback.author, source: "fallback" });
  } catch (err) {
    req.log.error({ err }, "Daily quote error");
    const fallback = FALLBACK_QUOTES[0];
    res.json({ text: fallback.text, author: fallback.author, source: "fallback" });
  }
});

export default router;

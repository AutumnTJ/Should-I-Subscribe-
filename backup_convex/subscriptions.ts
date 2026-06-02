import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

export const reflect = action({
  args: {
    service: v.string(),
    usage: v.string(),
    hesitation: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const hesitationLine = args.hesitation
      ? `They're hesitating because: "${args.hesitation}".`
      : "";

    const prompt = `You are helping someone decide whether to subscribe to something. Be brief, warm, and conclusive — like a trusted friend giving a quiet final word, not ongoing advice.

The person is considering: "${args.service}"
They plan to use it like this: "${args.usage}"
${hesitationLine}

Respond with exactly this structure (no extra text, no markdown, no labels):

Line 1: One word verdict — either "Subscribe", "Wait", or "Skip"
Line 2: One short sentence that mirrors what they actually said — their specific use case or hesitation. Do not describe the product in general terms. Do not say things like "it's worth it", "this is useful", or "this provides value". Stay close to their words. Be decisive and grounded.
Line 3 (optional): Only include if there's a clear, concrete reason things could shift — start with "This might change if…". Leave it out if it feels unnecessary.

Keep the whole response under 40 words. No bullet points, no headers, no extra commentary.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const text = response.choices[0].message.content ?? "";
    const lines = text.trim().split("\n").filter((l) => l.trim() !== "");

    const verdictRaw = lines[0]?.trim() ?? "Wait";
    const verdict = ["Subscribe", "Wait", "Skip"].includes(verdictRaw)
      ? (verdictRaw as "Subscribe" | "Wait" | "Skip")
      : "Wait";

    const reflection = lines[1]?.trim() ?? "";
    const mightChange = lines[2]?.trim() ?? "";

    return { verdict, reflection, mightChange };
  },
});

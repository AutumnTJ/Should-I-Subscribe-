import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const track = mutation({
  args: {
    type: v.string(),
    timestamp: v.number(),
    page: v.optional(v.string()),
    questionId: v.optional(v.number()),
    selectedOption: v.optional(v.string()),
    verdict: v.optional(v.string()),
    keepScore: v.optional(v.number()),
    cancelScore: v.optional(v.number()),
    compareFlag: v.optional(v.number()),
    answers: v.optional(v.array(v.string())),
    helpful: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("cancelQuizEvents", args);
  },
});

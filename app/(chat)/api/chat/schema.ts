import { z } from "zod";

export const chatRequestSchema = z.object({
  id: z.string(),
  message: z.object({
    role: z.literal("user"),
    content: z.string().min(1).max(2000),
  }),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

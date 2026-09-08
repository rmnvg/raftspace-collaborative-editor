import { z } from "zod";

export const shareUserIdSchema = z.string().uuid();

export const createShareSchema = z.object({
  userId: shareUserIdSchema,
});

import { z } from "zod";

export const portfolioItemSchema = z.object({
  productId: z.string().optional(),
  label: z.string().min(2),
  buyPriceAud: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  store: z.string().optional(),
  status: z.enum(["SEALED", "RIPPED", "GRADED", "SOLD", "HELD"]),
  purchasedAt: z.string()
});

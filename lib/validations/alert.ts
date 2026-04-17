import { z } from "zod";

export const alertSchema = z.object({
  productId: z.string().optional(),
  type: z.enum(["PRICE_DROP", "RESTOCK", "VALUE_BUY"]),
  targetPriceAud: z.number().nonnegative().optional(),
  notes: z.string().optional()
});

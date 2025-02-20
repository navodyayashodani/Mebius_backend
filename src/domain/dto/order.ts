import { z } from "zod";

export const CreateOrderDTO = z.object({
  items: z
    .object({
      product: z.object({
        _id: z.string(),
        name: z.string(),
        price: z.number(),
        image: z.string(),
        description: z.string(),
      }),
      quantity: z.number(),
    })
    .array(),
  shippingAddress: z.object({
    line_1: z.string(),
    line_2: z.string(),
    city: z.string(),
    state: z.string(),
    zip_code: z.string(),
    phone: z.string(),
  }),
});
import z from "zod";

export const createOrderSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  customerId: z.coerce.number().int().positive(),
  staffId: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED']).optional(),
  note: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        serviceId: z.coerce.number().int().positive(),
        duration: z.coerce.number().nonnegative().optional(),
        price: z.coerce.number().nonnegative().optional(),
        qty: z.coerce.number().int().positive().optional(),
        subtotal: z.coerce.number().nonnegative().optional(),
        amount: z.coerce.number().nonnegative().optional(),
      })
    ).min(1, "At least one service item is required"),
});

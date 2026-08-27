import z from "zod";

export const createOrderSchema = z.object({
  vehicleId: z.coerce.number().int("Vehicle ID must be an integer"),
  customerId: z.coerce.number().int("Customer ID must be an integer"),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"]).default("PENDING"),
  note: z.string().optional(),
  staffId: z.coerce.number().int("Staff ID must be an integer").optional(),
  items: z.array(z.object({
    serviceId: z.coerce.number().int("Service ID must be an integer"),
    duration: z.coerce.number().int("Duration must be an integer"),
    amount: z.coerce.number(),
    price: z.coerce.number(),
    qty: z.coerce.number().int("Quantity must be an integer"),
    subtotal: z.coerce.number(),
  })).min(1, "At least one service item is required"),
});

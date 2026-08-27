import z from "zod";

export const createServiceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  duration: z.coerce.number().positive("Duration must be a positive number"),
  price: z.coerce.number().positive("Price must be a positive number")
});

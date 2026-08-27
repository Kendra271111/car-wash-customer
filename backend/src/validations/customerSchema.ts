import z from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.coerce.number().int("Phone must be an integer"),
});

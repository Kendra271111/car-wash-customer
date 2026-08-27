import z from "zod";

export const createVehicleSchema = z.object({
  name: z.string().min(1, "Vehicle name is required"),
  plateNumber: z.string().min(1, "Plate number is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  customerId: z.coerce.number().int("Customer ID must be an integer").optional(),
});

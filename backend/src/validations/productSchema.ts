import z from "zod";

export const createProductSchema = z.object({
    name: z.string().min(3, "Name must be atleast three letter"),
    price: z.coerce.number().positive("Price must be positive"),
    description: z.string().optional(),
    // userId: z.coerce.number().int("User ID must be an integer"),
    // category: z.literal(["Large", "Medium", "Small"], "Category is not valid")
})

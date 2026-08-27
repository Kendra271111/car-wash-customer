import z from "zod";

export const validateTransferPoint = z.object({
senderId: z.coerce.number().positive("Sender ID must be a positive integer").min(1, "User doesn't exist"),
receiverId: z.coerce.number().positive("Receiver ID must be a positive integer").min(1, "User doesn't exist"),
amount: z.coerce.number().min(1, "Amount must be higher than 0").positive("Amount must be a positive integer")
})


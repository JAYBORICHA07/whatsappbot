import z from "zod";

export const reminderInputSchema = z.array(
  z.object({
    reminderId: z.string(),
    whatsappNumber: z.string(),
    title: z.string(),
    description: z.string(),
  })
);

export type reminderInputType = z.infer<typeof reminderInputSchema>;

export const reminderResponseSchema = z.array(
  z.object({
    success: z.boolean(),
    message: z.string(),
    reminderId: z.string(),
  })
);

export type reminderResponseType = z.infer<typeof reminderResponseSchema>;

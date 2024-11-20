import z from "zod";

export const reminderInputSchema = z
  .object({
    reminderId: z.string(),
    whatsappNumber: z.string(),
    title: z.string(),
    description: z.string(),
  })
  .array();

export type reminderInputType = z.infer<typeof reminderInputSchema>;

export const reminderResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    reminderId: z.string(),
  })
  .array();

export type reminderResponseType = z.infer<typeof reminderResponseSchema>;

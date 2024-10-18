"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmForMessageParsing = void 0;
const groq_1 = require("@langchain/groq");
const zod_1 = require("zod");
const prompts_1 = require("@langchain/core/prompts");
// Define the reminder schema using zod
const outputSchema = zod_1.z.object({
    isReminder: zod_1.z
        .boolean()
        .describe("This field tells us whether the given message indicates to send a reminder or not."),
    reminderTitle: zod_1.z
        .string()
        .describe("This is the title of the reminder.")
        .optional(),
    reminderDescription: zod_1.z
        .string()
        .describe("This is the description of the reminder.")
        .optional(),
    reminderDateTime: zod_1.z
        .string()
        .describe("This is the date and time at which the reminder is set, and it should be a JavaScript-convertible datetime it must be in this formate {2023-10-06T04:00:00.000Z}")
        .optional(),
    timeZone: zod_1.z
        .string()
        .describe("This is the time zone inferred from the first two digits of the given phone number (e.g., '91' for India).")
        .optional(),
});
// Refine the schema to enforce validation rules
// const outputSchema = reminderSchema.refine(
//   (data) => {
//     if (data.isReminder) {
//       return (
//         data.reminderTitle !== undefined &&
//         data.reminderDescription !== undefined &&
//         data.reminderDateTime !== undefined &&
//         data.timeZone !== undefined
//       );
//     }
//     return true;
//   },
//   {
//     message: "All reminder fields are required when isReminder is true",
//     path: ["isReminder"], // Shows the error on the isReminder field
//   }
// );
const llmForMessageParsing = (message, mobileNumber) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const TEMPLATE = `This is the message and always give output in valid JSON format which can be parsed. 
      Do not use markdown language in any part of the response. Provide response as plain strings. 
      Symbols like #, @, etc., should not be used. 
      Convert the time zone to words like 'Asia/Kolkata' and ensure the datetime is JavaScript-convertible.
      reminderDateTime must be in this formate [2023-10-06T04:00:00.000Z]

      if it is a reminder but there is no title then [isReminder] as true and [reminderTitle] as "Reminder" string and [reminderDescription] as "You set a reminder for this message".

      If input is not a reminder then avoid everything and return [isReminder] as false and [reminderTitle] and [reminderDescription] as empty string.
      
      If the given input is not a reminder then simply return [isReminder] as false and [reminderTitle] and [reminderDescription] as empty string.


      Input:

      {input}
    `;
        const LangChainPrompt = prompts_1.PromptTemplate.fromTemplate(TEMPLATE);
        const llm = new groq_1.ChatGroq({
            apiKey: "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",
            temperature: 0,
            maxTokens: undefined,
            maxRetries: 2,
        });
        const functionCallingModelGPT = llm.withStructuredOutput(outputSchema);
        const chain = LangChainPrompt.pipe(functionCallingModelGPT);
        // Invoke the LLM with the given message and mobile number
        const response = yield chain.invoke({
            input: { message: message, mobileNumber: mobileNumber },
        });
        return response;
    }
    catch (error) {
        console.error("Error during LLM invocation:", error);
        // Handle known zod validation errors gracefully
        if (error instanceof zod_1.z.ZodError) {
            throw {
                status: 400,
                message: "Validation error: Invalid reminder data",
                errors: error.errors,
            };
        }
        // Handle other errors gracefully
        throw {
            status: 500,
            message: "An unexpected error occurred while processing the request.",
            error: error instanceof Error ? error.message : String(error),
        };
    }
});
exports.llmForMessageParsing = llmForMessageParsing;

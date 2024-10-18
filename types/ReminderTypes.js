"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderResponseSchema = exports.reminderInputSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.reminderInputSchema = zod_1.default.array(zod_1.default.object({
    reminderId: zod_1.default.string(),
    whatsappNumber: zod_1.default.string(),
    title: zod_1.default.string(),
    description: zod_1.default.string(),
}));
exports.reminderResponseSchema = zod_1.default.array(zod_1.default.object({
    success: zod_1.default.boolean(),
    message: zod_1.default.string(),
    reminderId: zod_1.default.string(),
}));

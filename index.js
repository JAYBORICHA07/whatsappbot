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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Bailyes_1 = require("./utils/Bailyes");
const axios_1 = __importDefault(require("axios"));
const ReminderTypes_1 = require("./types/ReminderTypes");
const ChatGroq_1 = require("./llm/ChatGroq");
const botBaileys = new Bailyes_1.BaileysClass({});
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("Hello, World! This is an Express server using TypeScript.");
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    // Initialize Baileys event listeners only when the server starts
    initializeBaileys();
});
function initializeBaileys() {
    botBaileys.on("qr", (qr) => console.log("NEW QR CODE: ", qr));
    botBaileys.on("auth_failure", (error) => __awaiter(this, void 0, void 0, function* () { return console.log("ERROR BOT: ", error); }));
    botBaileys.on("ready", () => __awaiter(this, void 0, void 0, function* () { return console.log("READY BOT"); }));
}
botBaileys.on("message", (message) => __awaiter(void 0, void 0, void 0, function* () {
    if (!message.from.endsWith("@g.us")) {
        console.log("message received from: ", message.key.remoteJid.match(/(\d{12})/)[0]);
        try {
            const response = yield (0, ChatGroq_1.llmForMessageParsing)(message.body, message.key.remoteJid);
            console.log({ response });
        }
        catch (error) {
            console.log(error);
        }
        if (message.type === "poll") {
            const responseObj = {
                messageId: message.key.id,
                userPhoneNumber: message.key.remoteJid.match(/(\d{12})/)[0],
                messageBody: message.body,
            };
            console.log(responseObj);
            yield axios_1.default.post("http://localhost:3000/api/whatsapp/receivePoll", responseObj);
        }
    }
}));
app.post("/send-reminder", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { reminderInput } = yield req.body;
    const varifiedBodyObject = ReminderTypes_1.reminderInputSchema.safeParse(reminderInput);
    if (!varifiedBodyObject.success) {
        res.json({
            success: false,
            message: "Invalide body schema",
        });
    }
    const responseObj = [];
    Promise.resolve(reminderInput.map((reminder) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("reminder request received for :", reminder.whatsappNumber);
        try {
            botBaileys.sendText(reminder.whatsappNumber, `*🔔🚀 ${reminder.title} 🚀🔔* \n
          ━━━━━━━━━━━━━━━━━━━━━  \n
          📋 *Details:*  \n
          ${reminder.description}  \n\n

          ✨ *Don't miss it!* ✨  \n
          `);
            responseObj.push({
                success: true,
                message: "reminder sent",
                reminderId: reminder.reminderId,
            });
        }
        catch (error) {
            console.log(error);
            responseObj.push({
                success: true,
                message: "error sending message",
                reminderId: reminder.reminderId,
            });
        }
    })));
    res.send(responseObj);
}));
app.post("/send-login-poll", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { whatsappNumber } = yield req.body;
        console.log("poll request received for :", whatsappNumber);
        const poll = botBaileys.sendPoll(`${whatsappNumber}`, "An attempt of login was made from your number on remindme.com was it you?", {
            options: ["Yes", "No"],
        });
        console.log(poll);
        res.json({
            success: true,
            message: "poll sent",
        });
    }
    catch (error) {
        console.log(error);
        res.json({
            success: false,
            message: "poll failed",
        });
    }
}));

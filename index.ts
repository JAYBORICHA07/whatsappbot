import express from "express";
import type { Request, Response } from "express";
// import { BaileysClass } from "./utils/Bailyes";
import axios from "axios";
import { reminderInputSchema } from "./types/ReminderTypes";
import type {
  reminderInputType,
  reminderResponseType,
} from "./types/ReminderTypes";
import { llmForMessageParsing } from "./llm/ChatGroq";
import { config } from "dotenv";
import { BaileysClass } from "@bot-wa/bot-wa-baileys";
config();

const botBaileys = new BaileysClass();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, World! This is an Express server using TypeScript.");
});

app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
  initializeBaileys();
});

function initializeBaileys() {
  // botBaileys.on("qr", (qr) => console.log("NEW QR CODE: ", qr));
  botBaileys.on("auth_failure", async (error) =>
    console.log("ERROR BOT: ", error)
  );
  botBaileys.on("ready", async () => console.log("READY BOT"));
}

botBaileys.on("message", async (message) => {
  if (!message.from.endsWith("@g.us")) {
    console.log(
      "message received from: ",
      message.key.remoteJid.match(/(\d{12})/)[0]
    );
    try {
      const response = await llmForMessageParsing(
        message.body,
        message.key.remoteJid
      );

      console.log({ response });
    } catch (error) {
      console.log(error);
    }

    if (message.type === "poll") {
      const responseObj = {
        messageId: message.key.id,
        userPhoneNumber: message.key.remoteJid.match(/(\d{12})/)[0],
        messageBody: message.body,
      };
      console.log(responseObj);
      await axios.post(
        "http://localhost:3000/api/whatsapp/receivePoll",
        responseObj
      );
    }
  }
});

app.post("/send-reminder", async (req: Request, res: Response) => {
  const { reminderInput }: { reminderInput: reminderInputType } =
    await req.body;
  const varifiedBodyObject = reminderInputSchema.safeParse(reminderInput);
  if (!varifiedBodyObject.success) {
    res.json({
      success: false,
      message: "Invalide body schema",
    });
  }
  const responseObj: reminderResponseType = [];
  Promise.resolve(
    reminderInput.map(async (reminder) => {
      console.log("reminder request received for :", reminder.whatsappNumber);
      try {
        botBaileys.sendText(
          reminder.whatsappNumber,
          `*🔔🚀 ${reminder.title} 🚀🔔* \n
          ━━━━━━━━━━━━━━━━━━━━━  \n
          📋 *Details:*  \n
          ${reminder.description}  \n\n

          ✨ *Don't miss it!* ✨  \n
          `
        );

        responseObj.push({
          success: true,
          message: "reminder sent",
          reminderId: reminder.reminderId,
        });
      } catch (error) {
        console.log(error);
        responseObj.push({
          success: true,
          message: "error sending message",
          reminderId: reminder.reminderId,
        });
      }
    })
  );
  res.send(responseObj);
});

app.post("/send-login-poll", async (req: Request, res: Response) => {
  try {
    const { whatsappNumber } = await req.body;
    console.log("poll request received for :", whatsappNumber);
    const poll = botBaileys.sendPoll(
      `${whatsappNumber}`,
      "An attempt of login was made from your number on remindme.com was it you?",
      {
        options: ["Yes", "No"],
      }
    );
    console.log(poll);
    res.json({
      success: true,
      message: "poll sent",
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: "poll failed",
    });
  }
});

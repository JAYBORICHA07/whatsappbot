import express from "express";
import type { Request, Response } from "express";
import { BaileysClass } from "./utils/Bailyes";
import axios from "axios";
const botBaileys = new BaileysClass({});

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, World! This is an Express server using TypeScript.");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  // Initialize Baileys event listeners only when the server starts
  initializeBaileys();
});

function initializeBaileys() {
  botBaileys.on("qr", (qr) => console.log("NEW QR CODE: ", qr));
  botBaileys.on("auth_failure", async (error) =>
    console.log("ERROR BOT: ", error)
  );
  botBaileys.on("ready", async () => console.log("READY BOT"));
}
botBaileys.on("message", async (message) => {
  console.log(message);
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
});
app.get("/send-msg", async (req: Request, res: Response) => {
  try {
    botBaileys.sendPoll(
      "917984370336",
      "An attempt of login was made from your number on remindme.com was it you?",
      {
        options: ["Yes", "No"],
      }
    );
    res.send("Message sent");
  } catch (error) {
    console.log(error);
  }
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
    res.json("poll sent");
  } catch (error) {
    console.log(error);
  }
});

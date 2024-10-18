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
const Bailyes_1 = require("./utils/Bailyes");
const botBaileys = new Bailyes_1.BaileysClass({});
botBaileys.on('auth_failure', (error) => __awaiter(void 0, void 0, void 0, function* () { return console.log("ERROR BOT: ", error); }));
botBaileys.on('qr', (qr) => console.log("NEW QR CODE: ", qr));
botBaileys.on('ready', () => __awaiter(void 0, void 0, void 0, function* () { return console.log('READY BOT'); }));
let awaitingResponse = false;
botBaileys.on('message', (message) => __awaiter(void 0, void 0, void 0, function* () {
    if (!awaitingResponse) {
        yield botBaileys.sendPoll(message.from, 'Select an option', {
            options: ['text', 'media', 'file', 'sticker'],
            multiselect: false
        });
        awaitingResponse = true;
    }
    else {
        const command = message.body.toLowerCase().trim();
        switch (command) {
            case 'text':
                yield botBaileys.sendText(message.from, 'Hello world');
                break;
            case 'media':
                yield botBaileys.sendMedia(message.from, 'https://www.w3schools.com/w3css/img_lights.jpg', 'Hello world');
                break;
            case 'file':
                yield botBaileys.sendFile(message.from, 'https://github.com/pedrazadixon/sample-files/raw/main/sample_pdf.pdf');
                break;
            case 'sticker':
                yield botBaileys.sendSticker(message.from, 'https://gifimgs.com/animations/anime/dragon-ball-z/Goku/goku_34.gif', { pack: 'User', author: 'Me' });
                break;
            default:
                yield botBaileys.sendText(message.from, 'Sorry, I did not understand that command. Please select an option from the poll.');
                break;
        }
        awaitingResponse = false;
    }
}));

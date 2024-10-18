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
exports.BaileysClass = void 0;
const events_1 = require("events");
const pino_1 = __importDefault(require("pino"));
const node_cache_1 = __importDefault(require("node-cache"));
const baileys_1 = __importDefault(require("@whiskeysockets/baileys"));
const baileys_2 = require("@whiskeysockets/baileys");
const node_fs_1 = require("node:fs");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_1 = __importDefault(require("@ffmpeg-installer/ffmpeg"));
const mime_types_1 = __importDefault(require("mime-types"));
const utils_1 = __importDefault(require("./utils"));
const node_path_1 = require("node:path");
fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_1.default.path);
const msgRetryCounterCache = new node_cache_1.default();
class BaileysClass extends events_1.EventEmitter {
    constructor(args = {}) {
        var _a;
        super();
        this.getMessage = (key) => __awaiter(this, void 0, void 0, function* () {
            if (this.store) {
                const msg = yield this.store.loadMessage(key.remoteJid, key.id);
                return (msg === null || msg === void 0 ? void 0 : msg.message) || undefined;
            }
            // only if store is present
            return baileys_2.proto.Message.fromObject({});
        });
        this.getInstance = () => this.vendor;
        this.initBailey = () => __awaiter(this, void 0, void 0, function* () {
            const logger = (0, pino_1.default)({ level: this.globalVendorArgs.debug ? 'debug' : 'fatal' });
            const { state, saveCreds } = yield (0, baileys_2.useMultiFileAuthState)(this.NAME_DIR_SESSION);
            const { version, isLatest } = yield (0, baileys_2.fetchLatestBaileysVersion)();
            if (this.globalVendorArgs.debug)
                console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);
            // @ts-ignore
            this.store = (0, baileys_2.makeInMemoryStore)({ logger });
            this.store.readFromFile(`${this.NAME_DIR_SESSION}/baileys_store.json`);
            setInterval(() => {
                const path = `${this.NAME_DIR_SESSION}/baileys_store.json`;
                if ((0, node_fs_1.existsSync)(path)) {
                    this.store.writeToFile(path);
                }
            }, 10000);
            try {
                this.setUpBaileySock({ version, logger, state, saveCreds });
            }
            catch (e) {
                this.emit('auth_failure', e);
            }
        });
        // @ts-ignore
        this.setUpBaileySock = (_a) => __awaiter(this, [_a], void 0, function* ({ version, logger, state, saveCreds }) {
            var _b;
            this.sock = (0, baileys_1.default)({
                version,
                logger,
                printQRInTerminal: true,
                auth: {
                    creds: state.creds,
                    keys: (0, baileys_2.makeCacheableSignalKeyStore)(state.keys, logger),
                },
                browser: baileys_2.Browsers.macOS('Desktop'),
                msgRetryCounterCache,
                generateHighQualityLinkPreview: true,
                getMessage: this.getMessage,
            });
            (_b = this.store) === null || _b === void 0 ? void 0 : _b.bind(this.sock.ev);
            if (this.globalVendorArgs.usePairingCode) {
                if (this.globalVendorArgs.phoneNumber) {
                    // @ts-ignore
                    yield this.sock.waitForConnectionUpdate((update) => !!update.qr);
                    const code = yield this.sock.requestPairingCode(this.globalVendorArgs.phoneNumber);
                    if (this.plugin) {
                        this.emit('require_action', {
                            instructions: [
                                `Acepta la notificación del WhatsApp ${this.globalVendorArgs.phoneNumber} en tu celular 👌`,
                                `El token para la vinculación es: ${code}`,
                                `Necesitas ayuda: https://link.codigoencasa.com/DISCORD`,
                            ],
                        });
                    }
                    else {
                        this.emit('pairing_code', code);
                    }
                }
                else {
                    this.emit('auth_failure', 'phoneNumber is empty');
                }
            }
            this.sock.ev.on('connection.update', this.handleConnectionUpdate);
            this.sock.ev.on('creds.update', saveCreds);
        });
        this.handleConnectionUpdate = (update) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { connection, lastDisconnect, qr } = update;
            const statusCode = (_b = (_a = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode;
            if (connection === 'close') {
                if (statusCode !== baileys_2.DisconnectReason.loggedOut)
                    this.initBailey();
                if (statusCode === baileys_2.DisconnectReason.loggedOut)
                    this.clearSessionAndRestart();
            }
            if (connection === 'open') {
                this.vendor = this.sock;
                this.initBusEvents(this.sock);
                this.emit('ready', true);
            }
            if (qr && !this.globalVendorArgs.usePairingCode) {
                if (this.plugin)
                    this.emit('require_action', {
                        instructions: [
                            `Debes escanear el QR Code 👌 ${this.globalVendorArgs.name}.qr.png`,
                            `Recuerda que el QR se actualiza cada minuto `,
                            `Necesitas ayuda: https://link.codigoencasa.com/DISCORD`,
                        ],
                    });
                this.emit('qr', qr);
                if (this.plugin)
                    yield utils_1.default.baileyGenerateImage(qr, `${this.globalVendorArgs.name}.qr.png`);
            }
        });
        this.clearSessionAndRestart = () => {
            const PATH_BASE = (0, node_path_1.join)(process.cwd(), this.NAME_DIR_SESSION);
            (0, node_fs_1.rmSync)(PATH_BASE, { recursive: true, force: true });
            this.initBailey();
        };
        this.busEvents = () => [
            {
                event: 'messages.upsert',
                // @ts-ignore
                func: ({ messages, type }) => {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
                    // Ignore notify messages
                    if (type !== 'notify')
                        return;
                    const [messageCtx] = messages;
                    let payload = Object.assign(Object.assign({}, messageCtx), { body: (_c = (_b = (_a = messageCtx === null || messageCtx === void 0 ? void 0 : messageCtx.message) === null || _a === void 0 ? void 0 : _a.extendedTextMessage) === null || _b === void 0 ? void 0 : _b.text) !== null && _c !== void 0 ? _c : (_d = messageCtx === null || messageCtx === void 0 ? void 0 : messageCtx.message) === null || _d === void 0 ? void 0 : _d.conversation, from: (_e = messageCtx === null || messageCtx === void 0 ? void 0 : messageCtx.key) === null || _e === void 0 ? void 0 : _e.remoteJid, type: 'text' });
                    // Ignore pollUpdateMessage
                    if ((_f = messageCtx.message) === null || _f === void 0 ? void 0 : _f.pollUpdateMessage)
                        return;
                    // Ignore broadcast messages
                    if (payload.from === 'status@broadcast')
                        return;
                    // Ignore messages from self
                    if ((_g = payload === null || payload === void 0 ? void 0 : payload.key) === null || _g === void 0 ? void 0 : _g.fromMe)
                        return;
                    // Detect location
                    if ((_h = messageCtx.message) === null || _h === void 0 ? void 0 : _h.locationMessage) {
                        const { degreesLatitude, degreesLongitude } = messageCtx.message.locationMessage;
                        if (typeof degreesLatitude === 'number' && typeof degreesLongitude === 'number') {
                            payload = Object.assign(Object.assign({}, payload), { body: utils_1.default.generateRefprovider('_event_location_'), type: 'location' });
                        }
                    }
                    // Detect  media
                    if ((_j = messageCtx.message) === null || _j === void 0 ? void 0 : _j.imageMessage) {
                        payload = Object.assign(Object.assign({}, payload), { body: utils_1.default.generateRefprovider('_event_media_'), type: 'image' });
                    }
                    // Detect  ectar file
                    if ((_k = messageCtx.message) === null || _k === void 0 ? void 0 : _k.documentMessage) {
                        payload = Object.assign(Object.assign({}, payload), { body: utils_1.default.generateRefprovider('_event_document_'), type: 'file' });
                    }
                    // Detect voice note
                    if ((_l = messageCtx.message) === null || _l === void 0 ? void 0 : _l.audioMessage) {
                        payload = Object.assign(Object.assign({}, payload), { body: utils_1.default.generateRefprovider('_event_voice_note_'), type: 'voice' });
                    }
                    // Check from user and group is valid 
                    if (!utils_1.default.formatPhone(payload.from)) {
                        return;
                    }
                    const btnCtx = (_o = (_m = payload === null || payload === void 0 ? void 0 : payload.message) === null || _m === void 0 ? void 0 : _m.buttonsResponseMessage) === null || _o === void 0 ? void 0 : _o.selectedDisplayText;
                    if (btnCtx)
                        payload.body = btnCtx;
                    const listRowId = (_q = (_p = payload === null || payload === void 0 ? void 0 : payload.message) === null || _p === void 0 ? void 0 : _p.listResponseMessage) === null || _q === void 0 ? void 0 : _q.title;
                    if (listRowId)
                        payload.body = listRowId;
                    payload.from = utils_1.default.formatPhone(payload.from, this.plugin);
                    this.emit('message', payload);
                },
            },
            {
                event: 'messages.update',
                // @ts-ignore
                func: (message) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    for (const { key, update } of message) {
                        if (update.pollUpdates) {
                            const pollCreation = yield this.getMessage(key);
                            if (pollCreation) {
                                const pollMessage = yield (0, baileys_2.getAggregateVotesInPollMessage)({
                                    message: pollCreation,
                                    pollUpdates: update.pollUpdates,
                                });
                                const [messageCtx] = message;
                                let payload = Object.assign(Object.assign({}, messageCtx), { body: ((_a = pollMessage.find(poll => poll.voters.length > 0)) === null || _a === void 0 ? void 0 : _a.name) || '', from: utils_1.default.formatPhone(key.remoteJid, this.plugin), voters: pollCreation, type: 'poll' });
                                this.emit('message', payload);
                            }
                        }
                    }
                })
            }
        ];
        this.initBusEvents = (_sock) => {
            this.vendor = _sock;
            const listEvents = this.busEvents();
            for (const { event, func } of listEvents) {
                this.vendor.ev.on(event, func);
            }
        };
        /**
         * Send Media
         * @alpha
         * @param {string} number
         * @param {string} message
         * @example await sendMessage('+XXXXXXXXXXX', 'https://dominio.com/imagen.jpg' | 'img/imagen.jpg')
         */
        this.sendMedia = (number, mediaUrl, text) => __awaiter(this, void 0, void 0, function* () {
            try {
                const fileDownloaded = yield utils_1.default.generalDownload(mediaUrl);
                const mimeType = mime_types_1.default.lookup(fileDownloaded);
                if (typeof mimeType === 'string' && mimeType.includes('image'))
                    return this.sendImage(number, fileDownloaded, text);
                if (typeof mimeType === 'string' && mimeType.includes('video'))
                    return this.sendVideo(number, fileDownloaded, text);
                if (typeof mimeType === 'string' && mimeType.includes('audio')) {
                    const fileOpus = yield utils_1.default.convertAudio(fileDownloaded);
                    return this.sendAudio(number, fileOpus);
                }
                return this.sendFile(number, fileDownloaded);
            }
            catch (error) {
                console.error(`Error enviando media: ${error}`);
                throw error;
            }
        });
        /**
         * Send image
         * @param {*} number
         * @param {*} filePath
         * @param {*} text
         * @returns
         */
        this.sendImage = (number, filePath, text) => __awaiter(this, void 0, void 0, function* () {
            const numberClean = utils_1.default.formatPhone(number);
            return this.vendor.sendMessage(numberClean, {
                image: (0, node_fs_1.readFileSync)(filePath),
                caption: text !== null && text !== void 0 ? text : '',
            });
        });
        /**
         * Enviar video
         * @param {*} number
         * @param {*} imageUrl
         * @param {*} text
         * @returns
         */
        this.sendVideo = (number, filePath, text) => __awaiter(this, void 0, void 0, function* () {
            const numberClean = utils_1.default.formatPhone(number);
            return this.vendor.sendMessage(numberClean, {
                video: (0, node_fs_1.readFileSync)(filePath),
                caption: text,
                gifPlayback: this.globalVendorArgs.gifPlayback,
            });
        });
        /**
         * Enviar audio
         * @alpha
         * @param {string} number
         * @param {string} message
         * @param {boolean} voiceNote optional
         * @example await sendMessage('+XXXXXXXXXXX', 'audio.mp3')
         */
        this.sendAudio = (number, audioUrl) => __awaiter(this, void 0, void 0, function* () {
            const numberClean = utils_1.default.formatPhone(number);
            return this.vendor.sendMessage(numberClean, {
                audio: { url: audioUrl },
                ptt: true,
            });
        });
        /**
         *
         * @param {string} number
         * @param {string} message
         * @returns
         */
        this.sendText = (number, message) => __awaiter(this, void 0, void 0, function* () {
            const numberClean = utils_1.default.formatPhone(number);
            console.log(numberClean);
            return this.vendor.sendMessage(numberClean, { text: message });
        });
        /**
         *
         * @param {string} number
         * @param {string} filePath
         * @example await sendMessage('+XXXXXXXXXXX', './document/file.pdf')
         */
        this.sendFile = (number, filePath) => __awaiter(this, void 0, void 0, function* () {
            const numberClean = utils_1.default.formatPhone(number);
            const mimeType = mime_types_1.default.lookup(filePath);
            const fileName = filePath.split('/').pop();
            return this.vendor.sendMessage(numberClean, {
                document: { url: filePath },
                mimetype: mimeType,
                fileName: fileName,
            });
        });
        /**
         * @deprecated
         * @param {string} number
         * @param {string} text
         * @param {string} footer
         * @param {Array} buttons
         * @example await sendMessage("+XXXXXXXXXXX", "Your Text", "Your Footer", [{"buttonId": "id", "buttonText": {"displayText": "Button"}, "type": 1}])
         */
        this.sendButtons = (number, text, buttons) => __awaiter(this, void 0, void 0, function* () {
            const numberClean = utils_1.default.formatPhone(number);
            const templateButtons = buttons.map((btn, i) => ({
                buttonId: `id-btn-${i}`,
                buttonText: { displayText: btn.body },
                type: 1,
            }));
            const buttonMessage = {
                text,
                footer: '',
                buttons: templateButtons,
                headerType: 1,
            };
            return this.vendor.sendMessage(numberClean, buttonMessage);
        });
        /**
        *
        * @param {string} number
        * @param {string} text
        * @param {string} footer
        * @param {Array} poll
        * @example await sendMessage("+XXXXXXXXXXX", "Your Text", "Your Footer", [{"buttonId": "id", "buttonText": {"displayText": "Button"}, "type": 1}])
        */
        this.sendPoll = (number, text, poll) => __awaiter(this, void 0, void 0, function* () {
            const numberClean = utils_1.default.formatPhone(number);
            if (poll.options.length < 2)
                return false;
            const pollMessage = {
                name: text,
                values: poll.options,
                selectableCount: 1
            };
            return this.vendor.sendMessage(numberClean, { poll: pollMessage });
        });
        /**
         * @param {string} number
         * @param {string} message
         * @example await sendMessage('+XXXXXXXXXXX', 'Hello World')
         */
        this.sendMessage = (numberIn, message, options) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const number = utils_1.default.formatPhone(numberIn);
            if ((_a = options.options.buttons) === null || _a === void 0 ? void 0 : _a.length) {
                return this.sendPoll(number, message, {
                    options: (_b = options.options.buttons.map((btn, i) => (btn.body))) !== null && _b !== void 0 ? _b : [],
                });
            }
            if ((_c = options.options) === null || _c === void 0 ? void 0 : _c.media)
                return this.sendMedia(number, options.options.media, message);
            return this.sendText(number, message);
        });
        /**
         * @param {string} remoteJid
         * @param {string} latitude
         * @param {string} longitude
         * @param {any} messages
         * @example await sendLocation("xxxxxxxxxxx@c.us" || "xxxxxxxxxxxxxxxxxx@g.us", "xx.xxxx", "xx.xxxx", messages)
         */
        this.sendLocation = (remoteJid_1, latitude_1, longitude_1, ...args_1) => __awaiter(this, [remoteJid_1, latitude_1, longitude_1, ...args_1], void 0, function* (remoteJid, latitude, longitude, messages = null) {
            yield this.vendor.sendMessage(remoteJid, {
                location: {
                    degreesLatitude: latitude,
                    degreesLongitude: longitude,
                },
            }, { quoted: messages });
            return { status: 'success' };
        });
        /**
         * @param {string} remoteJid
         * @param {string} contactNumber
         * @param {string} displayName
         * @param {any} messages - optional
         * @example await sendContact("xxxxxxxxxxx@c.us" || "xxxxxxxxxxxxxxxxxx@g.us", "+xxxxxxxxxxx", "Robin Smith", messages)
         */
        this.sendContact = (remoteJid_1, contactNumber_1, displayName_1, ...args_1) => __awaiter(this, [remoteJid_1, contactNumber_1, displayName_1, ...args_1], void 0, function* (remoteJid, contactNumber, displayName, messages = null) {
            const cleanContactNumber = contactNumber.replace(/ /g, '');
            const waid = cleanContactNumber.replace('+', '');
            const vcard = 'BEGIN:VCARD\n' +
                'VERSION:3.0\n' +
                `FN:${displayName}\n` +
                'ORG:Ashoka Uni;\n' +
                `TEL;type=CELL;type=VOICE;waid=${waid}:${cleanContactNumber}\n` +
                'END:VCARD';
            yield this.vendor.sendMessage(remoteJid, {
                contacts: {
                    displayName: displayName,
                    contacts: [{ vcard }],
                },
            }, { quoted: messages });
            return { status: 'success' };
        });
        /**
         * @param {string} remoteJid
         * @param {string} WAPresence
         * @example await sendPresenceUpdate("xxxxxxxxxxx@c.us" || "xxxxxxxxxxxxxxxxxx@g.us", "recording")
         */
        this.sendPresenceUpdate = (remoteJid, WAPresence) => __awaiter(this, void 0, void 0, function* () {
            yield this.vendor.sendPresenceUpdate(WAPresence, remoteJid);
        });
        /**
         * @param {string} remoteJid
         * @param {string} url
         * @param {object} stickerOptions
         * @param {any} messages - optional
         * @example await sendSticker("xxxxxxxxxxx@c.us" || "xxxxxxxxxxxxxxxxxx@g.us", "https://dn/image.png" || "https://dn/image.gif" || "https://dn/image.mp4", {pack: 'User', author: 'Me'}, messages)
         */
        this.sendSticker = (remoteJid_1, url_1, stickerOptions_1, ...args_1) => __awaiter(this, [remoteJid_1, url_1, stickerOptions_1, ...args_1], void 0, function* (remoteJid, url, stickerOptions, messages = null) {
            const number = utils_1.default.formatPhone(remoteJid);
            const fileDownloaded = yield utils_1.default.generalDownload(url);
            yield this.vendor.sendMessage(number, {
                sticker: {
                    url: fileDownloaded
                },
            }, { quoted: messages });
        });
        this.vendor = null;
        this.store = null;
        this.globalVendorArgs = Object.assign({ name: `bot`, usePairingCode: false, phoneNumber: null, gifPlayback: false, dir: './' }, args);
        this.NAME_DIR_SESSION = `${this.globalVendorArgs.dir}${this.globalVendorArgs.name}_sessions`;
        this.initBailey();
        // is plugin?
        const err = new Error();
        const stack = err.stack;
        this.plugin = (_a = stack === null || stack === void 0 ? void 0 : stack.includes('createProvider')) !== null && _a !== void 0 ? _a : false;
    }
}
exports.BaileysClass = BaileysClass;

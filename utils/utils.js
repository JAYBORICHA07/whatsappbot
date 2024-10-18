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
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const follow_redirects_1 = __importDefault(require("follow-redirects"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const mime_types_1 = __importDefault(require("mime-types"));
const node_path_2 = require("node:path");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const sharp_1 = __importDefault(require("sharp"));
const qr_image_1 = __importDefault(require("qr-image"));
const { http, https } = follow_redirects_1.default;
const utils = {
    formatPhone: (contact, full = false) => {
        let domain = contact.includes('@g.us') ? '@g.us' : '@s.whatsapp.net';
        contact = contact.replace(domain, '');
        return !full ? `${contact}${domain}` : contact;
    },
    generateRefprovider: (prefix = '') => prefix ? `${prefix}_${node_crypto_1.default.randomUUID()}` : node_crypto_1.default.randomUUID(),
    isValidNumber: (rawNumber) => !rawNumber.match(/\@g.us\b/gm),
    prepareMedia: (media) => {
        if (utils.isUrl(media)) {
            return { url: media };
        }
        else {
            try {
                return { buffer: (0, node_fs_1.readFileSync)(media) };
            }
            catch (e) {
                console.error(`Failed to read file at ${media}`, e);
                throw e;
            }
        }
    },
    isUrl: (s) => {
        try {
            new URL(s);
            return true;
        }
        catch (_a) {
            return false;
        }
    },
    generalDownload: (url) => __awaiter(void 0, void 0, void 0, function* () {
        const checkIsLocal = (0, node_fs_1.existsSync)(url);
        const handleDownload = () => {
            const checkProtocol = url.includes('https:');
            const handleHttp = checkProtocol ? https : http;
            const name = `tmp-${Date.now()}-dat`;
            const fullPath = `${(0, node_os_1.tmpdir)()}/${name}`;
            const file = (0, node_fs_1.createWriteStream)(fullPath);
            if (checkIsLocal) {
                /**
                 * From Local
                 */
                return new Promise((res) => {
                    const response = {
                        headers: {
                            'content-type': mime_types_1.default.contentType((0, node_path_2.extname)(url)) || 'application/octet-stream',
                        },
                    };
                    res({ response, fullPath: url });
                });
            }
            else {
                /**
                 * From URL
                 */
                return new Promise((res, rej) => {
                    handleHttp.get(url, function (response) {
                        response.pipe(file);
                        file.on('finish', function () {
                            return __awaiter(this, void 0, void 0, function* () {
                                file.close();
                                // @ts-ignore
                                res({ response, fullPath });
                            });
                        });
                        file.on('error', function () {
                            file.close();
                            rej(null);
                        });
                    });
                });
            }
        };
        const handleFile = (pathInput, ext) => new Promise((resolve, reject) => {
            const fullPath = `${pathInput}.${ext}`;
            (0, node_fs_1.rename)(pathInput, fullPath, (err) => {
                if (err)
                    reject(null);
                resolve(fullPath);
            });
        });
        const httpResponse = yield handleDownload();
        const { ext } = yield utils.fileTypeFromFile(httpResponse.response);
        const getPath = yield handleFile(httpResponse.fullPath, ext);
        return getPath;
    }),
    convertAudio: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (filePath = '', format = 'opus') {
        const formats = {
            mp3: {
                code: 'libmp3lame',
                ext: 'mp3',
            },
            opus: {
                code: 'libopus',
                ext: 'opus',
            },
        };
        // @ts-ignore
        const opusFilePath = node_path_1.default.join(node_path_1.default.dirname(filePath), `${node_path_1.default.basename(filePath, node_path_1.default.extname(filePath))}.${formats[format].ext}`);
        yield new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(filePath)
                // @ts-ignore
                .audioCodec(formats[format].code)
                .audioBitrate('64k')
                // @ts-ignore
                .format(formats[format].ext)
                .output(opusFilePath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });
        return opusFilePath;
    }),
    fileTypeFromFile: (response) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const type = (_a = response.headers['content-type']) !== null && _a !== void 0 ? _a : null;
        const ext = mime_types_1.default.extension(type);
        return {
            type,
            ext,
        };
    }),
    baileyGenerateImage: (base64_1, ...args_1) => __awaiter(void 0, [base64_1, ...args_1], void 0, function* (base64, name = 'qr.png') {
        const PATH_QR = `${process.cwd()}/${name}`;
        let qr_svg = qr_image_1.default.image(base64, { type: 'png', margin: 4 });
        const writeFilePromise = () => new Promise((resolve, reject) => {
            const file = qr_svg.pipe((0, node_fs_1.createWriteStream)(PATH_QR));
            file.on('finish', () => resolve(true));
            file.on('error', reject);
        });
        yield writeFilePromise();
        yield utils.cleanImage(PATH_QR);
    }),
    cleanImage: (FROM) => __awaiter(void 0, void 0, void 0, function* () {
        const readBuffer = () => __awaiter(void 0, void 0, void 0, function* () {
            const data = yield node_fs_1.promises.readFile(FROM);
            return Buffer.from(data);
        });
        const imgBuffer = yield readBuffer();
        return new Promise((resolve, reject) => {
            (0, sharp_1.default)(imgBuffer, { failOnError: false })
                .extend({
                top: 15,
                bottom: 15,
                left: 15,
                right: 15,
                background: { r: 255, g: 255, b: 255, alpha: 1 },
            })
                .toFile(FROM, (err) => {
                if (err)
                    reject(err);
                resolve(true);
            });
        });
    })
};
exports.default = utils;

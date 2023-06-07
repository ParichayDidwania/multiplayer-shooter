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
exports.AppManagerService = void 0;
const http_1 = require("http");
const url_1 = require("url");
class AppManagerService {
    constructor(app) {
        this._app = app;
        this._server = (0, http_1.createServer)(this._app);
        this.start();
    }
    start() {
        this._server.listen(7000, () => console.log(`Listening on port 7000`));
        this.setServerListeners();
    }
    onUpgrade(req, socket, head) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const query = (0, url_1.parse)((_a = req.url) !== null && _a !== void 0 ? _a : "", true).query;
            if (query.user) {
                socket.user_id = `${query['user']}`;
            }
            else {
                socket.destroy();
            }
        });
    }
    setServerListeners() {
        this._server.on('upgrade', this.onUpgrade);
    }
    get http_server() {
        return this._server;
    }
}
exports.AppManagerService = AppManagerService;

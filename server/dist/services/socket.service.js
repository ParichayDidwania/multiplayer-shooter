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
exports.SocketService = void 0;
const ws_1 = require("ws");
const event_manager_service_1 = require("./event-manager.service");
const { Position } = require('../../protos/protoFile_pb');
class SocketService {
    constructor(server) {
        this._server = server;
        this._wsserver = new ws_1.WebSocket.Server({
            server: this._server
        });
        this._eventManager = event_manager_service_1.eventManager;
    }
    onMessage(socket) {
        return (socket_data) => {
            let message;
            try {
                let messageStr = socket_data.toString();
                if (messageStr[0] != "{") {
                    message = Position.deserializeBinary(socket_data).toObject();
                }
                else {
                    message = JSON.parse(messageStr);
                }
                try {
                    this._eventManager.handleEvents(socket, message);
                }
                catch (e) {
                    socket.send(JSON.stringify({
                        eventName: "ERROR",
                        message: e.message
                    }));
                }
            }
            catch (err) {
                console.log(err);
            }
        };
    }
    onClose(socket) {
        return () => {
            try {
                this._eventManager.handleDisconnection(socket);
            }
            catch (e) { }
        };
    }
    setListeners() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Sockets live!');
            this._wsserver.on('connection', (socket) => {
                let customSocket = this.setSocketIdentifiers(socket);
                customSocket.on('message', this.onMessage(customSocket));
                customSocket.on('close', this.onClose(customSocket));
            });
        });
    }
    setSocketIdentifiers(socket) {
        if (!(socket === null || socket === void 0 ? void 0 : socket._socket.user_id) && !(socket === null || socket === void 0 ? void 0 : socket._socket.isMpl)) {
            throw new Error('Socket Info Missing');
        }
        Object.defineProperties(socket, {
            user_id: { get: function () { return this._socket.user_id; }, set: function (user_id) { this._socket.user_id = user_id; } },
            room_id: { get: function () { return this._socket.room_id; }, set: function (room_id) { this._socket.room_id = room_id; } },
        });
        if (socket.user_id) {
            console.log(`${socket.user_id} is connected!`);
        }
        return socket;
    }
}
exports.SocketService = SocketService;

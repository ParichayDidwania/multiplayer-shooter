"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_manager_service_1 = require("./services/app-manager.service");
const express_1 = __importDefault(require("express"));
const socket_service_1 = require("./services/socket.service");
const udp_service_1 = require("./services/udp.service");
let app = (0, express_1.default)();
let appManager = new app_manager_service_1.AppManagerService(app);
let udpService = new udp_service_1.UdpService();
udpService.setListeners();
let socketService = new socket_service_1.SocketService(appManager.http_server);
socketService.setListeners();

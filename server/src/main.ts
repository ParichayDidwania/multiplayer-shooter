import { AppManagerService } from "./services/app-manager.service";
import express from "express";
import { SocketService } from "./services/socket.service";
import { UdpService } from "./services/udp.service";

let app = express()
let appManager = new AppManagerService(app);
let udpService = new UdpService();
udpService.setListeners();
let socketService = new SocketService(appManager.http_server);
socketService.setListeners();

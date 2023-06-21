"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UdpService = void 0;
const event_manager_service_1 = require("./event-manager.service");
const geckos = require("fix-esm").require("@geckos.io/server");
class UdpService {
    constructor() {
        this._server = geckos.geckos();
        this._server.listen(7001);
        this._eventManager = event_manager_service_1.eventManager;
        this._udpRooms = {};
        this._eventManager.setUdpService(this);
        this._eventManager.setUdpRoomData(this._udpRooms);
    }
    deleteRoom(room_id) {
        delete this._udpRooms[room_id];
    }
    setListeners() {
        this._server.onConnection((channel) => {
            channel.onDisconnect(() => {
                if (channel.room_id && channel.uid && this._udpRooms[channel.room_id] && this._udpRooms[channel.room_id][channel.uid]) {
                    delete this._udpRooms[channel.room_id][channel.uid];
                }
            });
            channel.on('JOIN', (data) => {
                console.log(data.uid, 'joined udp');
                if (!data.room_id || !data.uid) {
                    throw new Error('Uid or room Id not provided!');
                }
                if (this._udpRooms[data.room_id]) {
                    this._udpRooms[data.room_id][data.uid] = channel;
                }
                else {
                    this._udpRooms[data.room_id] = {};
                    this._udpRooms[data.room_id][data.uid] = channel;
                }
                channel.uid = data.uid;
                channel.room_id = data.room_id;
            });
            channel.on('POSITION', (data) => {
                this._eventManager.handleUdpEvents(data, channel.room_id);
            });
            channel.on('SHOOT', (data) => {
                this._eventManager.handleUdpEvents(data, channel.room_id);
            });
            channel.on('BOMB_PICKED', (data) => {
                this._eventManager.handleUdpEvents(data, channel.room_id);
            });
            channel.on('BOMB_DROPPED', (data) => {
                this._eventManager.handleUdpEvents(data, channel.room_id);
            });
            channel.on('START_BOMB_DIFFUSE', (data) => {
                this._eventManager.handleUdpEvents(data, channel.room_id);
            });
        });
    }
}
exports.UdpService = UdpService;

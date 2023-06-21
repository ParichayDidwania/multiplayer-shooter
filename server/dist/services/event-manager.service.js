"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventManager = exports.EventManager = void 0;
const engine_service_1 = require("./engine.service");
const engine_dto_1 = require("../dtos/engine.dto");
const { Position } = require('../../protos/protoFile_pb');
class EventManager {
    constructor() {
        this.socketRooms = {};
        this.engine = new engine_service_1.Engine(this.socketRooms);
        this.udpRooms = {};
    }
    handleUdpEvents(data, room_id) {
        try {
            let channels = this.udpRooms[room_id];
            switch (data.eventName) {
                case "POSITION": {
                    let team = this.engine.updatePosition(room_id, data.uid, data.x, data.y, data.angle);
                    this.broadcastPlayerPosition(channels, data.uid, data.x, data.y, data.angle, team);
                    break;
                }
                case "SHOOT": {
                    let team = this.engine.updateShots(room_id, data.uid, data.id, data.x, data.y, data.angle);
                    this.broadcastShots(channels, data.uid, data.x, data.y, data.angle, team);
                    break;
                }
                case "BOMB_PICKED":
                    this.engine.pickBomb(room_id, data.uid);
                    this.broadcastBombPicked(channels, room_id);
                    break;
                case "BOMB_DROPPED":
                    let uid = this.engine.dropBomb(room_id, data.uid);
                    if (uid) {
                        this.broadcastBombDropped(channels, room_id, uid);
                    }
                    break;
                case "START_BOMB_DIFFUSE":
                    this.broadcastStartBombDiffuse(channels, room_id, data.uid);
                    break;
            }
        }
        catch (e) {
            console.log(e);
        }
    }
    handleEvents(socket, message) {
        switch (message.eventName) {
            case "CREATE":
                this.engine.createRoom(message.room_id, message.uid);
                this.addToSocketRoom(socket, message.room_id);
                socket.room_id = message.room_id;
                this.engine.broadcastRoomData(message.room_id);
                break;
            case "JOIN":
                this.engine.addUserToRoom(message.room_id, message.uid);
                this.addToSocketRoom(socket, message.room_id);
                socket.room_id = message.room_id;
                this.engine.broadcastRoomData(message.room_id);
                break;
            case 'SELECTED_TEAM':
                this.engine.joinTeam(message.room_id, message.uid, message.team);
                this.engine.broadcastRoomData(message.room_id);
                break;
            case 'START_MATCH':
                this.engine.startMatch(socket.room_id, socket.user_id);
                this.engine.broadcastRoomData(socket.room_id);
                break;
            case "HIT":
                let healthObj = this.engine.validateHit(socket.room_id, socket.user_id, message.enemyUid, message.shot_id);
                if (healthObj) {
                    this.broadcastHealth(socket.room_id, healthObj.uid, healthObj.team, healthObj.health, healthObj.isAlive, socket.user_id);
                    if (healthObj.bomb_drop_info) {
                        let channels = this.udpRooms[socket.room_id];
                        this.broadcastBombDropped(channels, socket.room_id, healthObj.bomb_drop_info.enemyUid);
                    }
                    if (!healthObj.isAlive) {
                        this.engine.checkRoundStatus(socket.room_id);
                    }
                }
                break;
            case "BOMB_PLANTED":
                this.engine.plantBomb(socket.room_id, socket.user_id);
                break;
            case "BOMB_DIFFUSED":
                this.engine.diffuseBomb(socket.room_id, socket.user_id);
                break;
            case "RECONNECT":
                this.engine.reconnect(message.room_id, socket.user_id);
                this.addToSocketRoom(socket, message.room_id);
                socket.room_id = message.room_id;
                this.engine.sendRoomData(message.room_id, socket);
                break;
        }
    }
    handleDisconnection(socket) {
        if (socket.room_id && socket.user_id) {
            let room = this.engine.getRoomData(socket.room_id);
            if (!room) {
                return;
            }
            this.removeFromSocketRoom(socket);
            this.engine.disconnectUser(socket.room_id, socket.user_id);
            if (room.state == engine_dto_1.State.CREATED) {
                this.engine.broadcastRoomData(socket.room_id);
            }
        }
    }
    broadcastPlayerPosition(channels, uid, x, y, angle, team) {
        let posObj = {
            eventName: 'POSITION',
            uid: uid,
            x: x,
            y: y,
            angle: angle,
            team: team
        };
        for (let user in channels) {
            let channel = channels[user];
            channel.emit('POSITION', posObj);
        }
    }
    broadcastShots(channels, uid, x, y, angle, team) {
        let shot = {
            eventName: "SHOOT",
            uid: uid,
            x: x,
            y: y,
            angle: angle,
            team: team
        };
        for (let user in channels) {
            let channel = channels[user];
            channel.emit('SHOOT', shot);
        }
    }
    broadcastBombPicked(channels, room_id) {
        let room = this.engine.getRoomData(room_id);
        let picked = {
            eventName: 'BOMB_PICKED',
            uid: room.bomb.isPicked.by
        };
        for (let user in channels) {
            let channel = channels[user];
            channel.emit('BOMB_PICKED', picked);
        }
    }
    broadcastBombDropped(channels, room_id, uid) {
        let room = this.engine.getRoomData(room_id);
        let dropped = {
            eventName: 'BOMB_DROPPED',
            uid: uid,
            x: room.bomb.x,
            y: room.bomb.y
        };
        for (let user in channels) {
            let channel = channels[user];
            channel.emit('BOMB_DROPPED', dropped);
        }
    }
    broadcastStartBombDiffuse(channels, room_id, uid) {
        let startDiffuse = {
            eventName: 'START_BOMB_DIFFUSE',
            uid: uid
        };
        for (let user in channels) {
            let channel = channels[user];
            channel.emit('START_BOMB_DIFFUSE', startDiffuse);
        }
    }
    broadcastHealth(room_id, uid, team, health, isAlive, shooter) {
        let socketRoom = this.socketRooms[room_id];
        let shooterUser = this.engine.getRoomData(room_id).users[shooter];
        let healthObj = JSON.stringify({
            eventName: "HEALTH",
            uid: uid,
            team: team,
            health: health,
            isAlive: isAlive,
            shooter: {
                uid: shooter,
                team: shooterUser.team,
                kills: shooterUser.kills,
                deaths: shooterUser.deaths
            },
        });
        for (let socket of socketRoom) {
            socket.send(healthObj);
        }
    }
    sendTeamSelectData(socket) {
        socket.send(JSON.stringify({
            eventName: "SELECT_TEAM"
        }));
    }
    addToSocketRoom(socket, room_id) {
        let room = this.socketRooms[room_id];
        if (room) {
            room.push(socket);
        }
        else {
            this.socketRooms[room_id] = [socket];
        }
    }
    removeFromSocketRoom(socket) {
        if (socket.room_id) {
            let room = this.socketRooms[socket.room_id];
            if (room) {
                for (let i = 0; i < room.length; i++) {
                    if (socket.user_id == room[i].user_id) {
                        room.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }
    setUdpService(udpService) {
        this.engine.udpService = udpService;
    }
    setUdpRoomData(udpRooms) {
        this.udpRooms = udpRooms;
    }
}
exports.EventManager = EventManager;
exports.eventManager = new EventManager();

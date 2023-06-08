"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventManager = void 0;
const engine_service_1 = require("./engine.service");
const engine_dto_1 = require("../dtos/engine.dto");
const { Position } = require('../../protos/protoFile_pb');
class EventManager {
    constructor() {
        this.socketRooms = {};
        this.engine = new engine_service_1.Engine(this.socketRooms);
    }
    handleEvents(socket, message, socketList) {
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
            case "POSITION": {
                let team = this.engine.updatePosition(socket.room_id, message.uid, message.x, message.y, message.angle);
                this.broadcastPlayerPosition(socket.room_id, message.uid, message.x, message.y, message.angle, team);
                break;
            }
            case "SHOOT": {
                let team = this.engine.updateShots(socket.room_id, socket.user_id, message.id, message.x, message.y, message.angle);
                this.broadcastShots(socket.room_id, socket.user_id, message.x, message.y, message.angle, team);
                break;
            }
            case "HIT":
                let healthObj = this.engine.validateHit(socket.room_id, socket.user_id, message.enemyUid, message.shot_id);
                if (healthObj) {
                    this.broadcastHealth(socket.room_id, healthObj.uid, healthObj.team, healthObj.health, healthObj.isAlive, socket.user_id);
                    if (!healthObj.isAlive) {
                        this.engine.checkRoundStatus(socket.room_id);
                    }
                }
                break;
            case "BOMB_PICKED":
                this.engine.pickBomb(socket.room_id, socket.user_id);
                break;
            case "BOMB_DROPPED":
                this.engine.dropBomb(socket.room_id, socket.user_id);
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
    broadcastPlayerPosition(room_id, uid, x, y, angle, team) {
        let socketRoom = this.socketRooms[room_id];
        let positionProtobuf = new Position();
        positionProtobuf.setEventName("POSITION");
        positionProtobuf.setUid(uid);
        positionProtobuf.setX(x);
        positionProtobuf.setY(y);
        positionProtobuf.setAngle(angle);
        positionProtobuf.setTeam(team);
        let serializedPos = positionProtobuf.serializeBinary();
        for (let socket of socketRoom) {
            socket.send(serializedPos, { binary: true });
        }
    }
    broadcastShots(room_id, uid, x, y, angle, team) {
        let socketRoom = this.socketRooms[room_id];
        let shot = JSON.stringify({
            eventName: "SHOOT",
            uid: uid,
            x: x,
            y: y,
            angle: angle,
            team: team
        });
        for (let socket of socketRoom) {
            socket.send(shot);
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
}
exports.EventManager = EventManager;

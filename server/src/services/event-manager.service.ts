import { IWebSocket } from "./socket.service";
import { Engine } from "./engine.service";
import { State, Team } from "../dtos/engine.dto";
export class EventManager {
    engine: Engine;
    socketRooms: Record<string, Array<IWebSocket>>

    constructor() {
        this.socketRooms = {};
        this.engine = new Engine(this.socketRooms);
    }

    handleEvents(socket: IWebSocket, message: any, socketList: Set<IWebSocket>) {
        switch(message.event_name) {
            case "CREATE":
                this.engine.createRoom(message.room_id, message.uid);
                this.addToSocketRoom(socket, message.room_id);
                socket.room_id = message.room_id;
                this.sendTeamSelectData(socket)
                break;

            case "JOIN":
                this.engine.addUserToRoom(message.room_id, message.uid);
                this.addToSocketRoom(socket, message.room_id);
                socket.room_id = message.room_id;
                this.sendTeamSelectData(socket);
                break;

            case 'SELECTED_TEAM':
                this.engine.joinTeam(message.room_id, message.uid, message.team);
                this.broadcastRoomData(message.room_id);
                break;

            case 'START_MATCH':
                this.engine.startMatch(socket.room_id, socket.user_id);
                this.broadcastRoomData(socket.room_id);
                break;

            case "POSITION":
                let team = this.engine.updatePosition(socket.room_id, message.uid, message.x, message.y, message.angle);
                this.broadcastPlayerPosition(socket.room_id, message.uid, message.x, message.y, message.angle, team)
                break;

            case  "SHOOT":
                this.engine.updateShots(socket.room_id, socket.user_id, message.id, message.x, message.y, message.angle);
                this.broadcastShots(socket.room_id, socket.user_id, message.x, message.y, message.angle);
                break;

            case "HIT":
                let healthObj = this.engine.validateHit(socket.room_id, socket.user_id, message.enemyUid, message.shot_id);
                if(healthObj) {
                    this.broadcastHealth(socket.room_id, healthObj.uid, healthObj.team, healthObj.health, healthObj.isAlive);
                }
                break;
        }
    }

    handleDisconnection(socket: IWebSocket) {
        if(socket.room_id && socket.user_id) {
            this.removeFromSocketRoom(socket);
            this.engine.disconnectUser(socket.room_id, socket.user_id);
            this.broadcastRoomData(socket.room_id);
        }
    }

    broadcastRoomData(room_id: string) {
        let room = this.engine.getRoomData(room_id);
        let socketRoom = this.socketRooms[room_id];
        for(let socket of socketRoom) {
            socket.send(JSON.stringify({
                event_name: "ROOM_DATA",
                room: room,
                time_left: Math.floor((new Date().getTime() - room.current_round_start_timestamp)/1000)
            }))
        }
    }

    broadcastPlayerPosition(room_id: string, uid: string, x: number, y: number, angle: number, team: Team) {
        let socketRoom = this.socketRooms[room_id];
        for(let socket of socketRoom) {
            socket.send(JSON.stringify({
                event_name: "POSITION",
                uid: uid,
                x: x,
                y: y,
                angle: angle,
                team: team
            }))
        }
    }

    broadcastShots(room_id: string, uid: string, x: number, y: number, angle: number) {
        let socketRoom = this.socketRooms[room_id];
        for(let socket of socketRoom) {
            socket.send(JSON.stringify({
                event_name: "SHOOT",
                uid: uid,
                x: x,
                y: y,
                angle: angle,
            }))
        }
    }

    broadcastHealth(room_id: string, uid: string, team: Team, health: number, isAlive: boolean) {
        let socketRoom = this.socketRooms[room_id];
        for(let socket of socketRoom) {
            socket.send(JSON.stringify({
                event_name: "HEALTH",
                uid: uid,
                team: team,
                health: health,
                isAlive: isAlive
            }))
        }
    }

    sendTeamSelectData(socket: IWebSocket) {
        socket.send(JSON.stringify({
            event_name: "SELECT_TEAM",
        }))
    }

    addToSocketRoom(socket: IWebSocket, room_id: string) {
        let room = this.socketRooms[room_id];
        if(room) {
            room.push(socket);
        } else {
            this.socketRooms[room_id] = [socket]
        }
    }

    removeFromSocketRoom(socket: IWebSocket) {
        if(socket.room_id) {
            let room = this.socketRooms[socket.room_id];
            if(room) {
                for(let i = 0; i < room.length; i++) {
                    if(socket.user_id == room[i].user_id) {
                        room.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }
}
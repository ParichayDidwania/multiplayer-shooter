import { ConnectionStatus, GAMECONSTANTS, Room, Rooms, SPAWNS, Shot, SpawnPoint, State, Team, User } from "../dtos/engine.dto";
import { IWebSocket } from "./socket.service";

export class Engine {
    private rooms: Rooms = {};
    socketRooms: Record<string, Array<IWebSocket>>

    constructor(socketRooms: Record<string, Array<IWebSocket>>) {
        this.socketRooms = socketRooms;
    }

    createRoomData() {
        let room : Room = {
            state: State.CREATED,
            users: {},
            rounds: [],
            isBombPlanted: false,
            spawnPoints: JSON.parse(JSON.stringify(SPAWNS)),
            current_round: 0,
            current_round_start_timestamp: 0
        } 
        
        return room;
    }

    checkIfRoomExists(room_id: string) {
        let room = this.rooms[room_id];
        return room != undefined;
    }

    checkIfUserExists(room: Room, uid: string) {
        let user = room.users[uid];
        return user != undefined;
    }

    addUserToRoom(room_id: string, uid: string, isAdmin: boolean = false) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }

        let room = this.rooms[room_id];

        if(this.checkIfUserExists(room, uid)) {
            throw new Error('This Username already exists in the room');
        }

        let user : User = {
            uid: uid,
            pos_x: -1,
            pos_y: -1,
            angle: 0,
            health: GAMECONSTANTS.MAX_HEALTH,
            team: Team.NONE,
            isAlive: true,
            isAdmin: isAdmin,
            status: ConnectionStatus.CONNECTED,
            shots: [],
            spawn: {
                x: -1,
                y: -1,
                angle: 0
            }
        }
        room.users[uid] = user;
    }

    joinTeam(room_id: string, uid: string, team: Team) {
        if(team == Team.NONE) {
            throw new Error('Invalid team selected!');
        }

        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }

        let room = this.rooms[room_id];

        if(!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }

        let user = room.users[uid];

        if(user.team != Team.NONE) {
            throw new Error('You have already selected a team');
        }

        user.team = team;
        let pointFound = false;
        for(let i = 0; i < room.spawnPoints[team].length; i++) {
            let point: SpawnPoint = room.spawnPoints[team][i];
            if(!point.isTaken) {
                user.pos_x = point.x;
                user.pos_y = point.y;
                user.angle = point.angle;
                point.isTaken = true;
                point.by = uid;

                user.spawn.x = point.x;
                user.spawn.y = point.y;
                user.spawn.angle = point.angle;

                pointFound = true;
                break;
            }
        }

        if(!pointFound) {
            throw new Error('No spawn point available');
        }

        let pos = {
            x: user.pos_x,
            y: user.pos_y,
            angle: user.angle
        }

        return pos;
    }

    createRoom(room_id: string, uid: string) {
        if(this.checkIfRoomExists(room_id)) {
            throw new Error('Room Already Exists');
        }

        let room = this.createRoomData();
        this.rooms[room_id] = room;

        this.addUserToRoom(room_id, uid, true);
    }

    getRoomData(room_id: string) {
        return this.rooms[room_id];
    }

    startMatch(room_id: string, uid: string) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }

        let room = this.rooms[room_id];

        if(!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }

        let user = room.users[uid];
        if(!user.isAdmin) {
            throw new Error('Only the admin can start the match')
        }

        let isCT = false;
        let isT = false;
        for(let user_id in room.users) {
            isCT = isCT ? isCT : room.users[user_id].team == Team.COUNTER_TERRORIST;
            isT = isT ? isT : room.users[user_id].team == Team.TERRORIST;

            if(isCT && isT) {
                break;
            }
        }

        if(!isCT || !isT) {
            throw new Error('Atleast 1 user should be on both teams to start the match');
        }

        room.state = State.MATCH_STARTED;
        this.updateRoundData(room);
        room.current_round_start_timestamp = new Date().getTime();
    }

    updateRoundData(room: Room) {
        room.current_round += 1;
        room.rounds.push({ id: room.current_round });
    }

    startRoundTimer(room_id: string) {
        setTimeout(() => {
            // end match
        }, GAMECONSTANTS.ROUND_TIME)
    }

    disconnectUser(room_id: string, uid: string) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }

        let room = this.rooms[room_id];

        if(!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }

        if(room.state == State.CREATED) {
            let team = room.users[uid].team;
            if(team != Team.NONE) {
                for(let point of room.spawnPoints[team]) {
                    if(point.isTaken && point.by == uid) {
                        point.isTaken = false;
                        point.by = undefined;
                    }
                }
            }

            delete room.users[uid];            
        } else {
            room.users[uid].status = ConnectionStatus.DISCONNECTED;
        }
    }

    updatePosition(room_id: string, uid: string, x: number, y: number, angle: number) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }

        let room = this.rooms[room_id];

        if(!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }

        let user = room.users[uid];
        user.pos_x = x;
        user.pos_y = y;
        user.angle = angle;

        return user.team;
    }

    updateShots(room_id: string, uid: string, shotId: number, x: number, y: number, angle: number) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }

        let room = this.rooms[room_id];

        if(!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }

        let shot: Shot = {
            id: shotId,
            x: x,
            y: y,
            angle: angle,
            timestamp: new Date().getTime()
        }

        let shots = room.users[uid].shots
        if(shots.length >= GAMECONSTANTS.MAX_BULLET_BUFFER - 1) {
            shots.shift()
        }

        shots.push(shot);
    }

    validateHit(room_id: string, uid: string, enemyUid: string, shot_id: number) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }

        let room = this.rooms[room_id];

        if(!this.checkIfUserExists(room, uid) || !this.checkIfUserExists(room, enemyUid)) {
            throw new Error('User or enemy doesnot exist in the room');
        }

        let currentTimeStamp = new Date().getTime();

        let shot = room.users[uid].shots.find(x => x.id == shot_id);
        if(!shot) {
            return;
        }

        let timeDifferenceMS = currentTimeStamp - shot.timestamp;
        let vx = Math.cos(shot.angle) * GAMECONSTANTS.BULLET_VELOCITY;
        let vy = Math.sin(shot.angle) * GAMECONSTANTS.BULLET_VELOCITY;

        let bulletCoords = {
            x: shot.x + (vx * timeDifferenceMS / 1000),
            y: shot.y + (vy * timeDifferenceMS / 1000)
        }

        let enemy = room.users[enemyUid];
        let dist = this.getDistanceBetweenPoints(bulletCoords.x, bulletCoords.y, enemy.pos_x, enemy.pos_y);


        if(dist <= GAMECONSTANTS.HIT_REG_RADIUS) {
            enemy.health -= GAMECONSTANTS.SHOT_DAMAGE;
            if(enemy.health <= 0) {
                enemy.isAlive = false;
                enemy.health = 0;
                this.checkRoundStatus(room_id);
            }
            return { uid: enemyUid, team: enemy.team, health: enemy.health, isAlive: enemy.isAlive };
        }
    }

    getDistanceBetweenPoints(x1: number, y1: number, x2: number, y2: number) {
        return Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
    }

    checkRoundStatus(room_id: string) {
        let room = this.rooms[room_id];
        let ctKilled = 0;
        let tKilled = 0;

        let ctTotal = 0;
        let tTotal = 0;

        for(let userId in room.users) {
            let user = room.users[userId];
            switch(user.team) {
                case Team.COUNTER_TERRORIST:
                    if(!user.isAlive) {
                        ctKilled ++;
                    }
                    ctTotal ++;
                    break;
                
                case Team.TERRORIST:
                    if(!user.isAlive) {
                        tKilled ++;
                    }
                    tTotal ++;
                    break;
            }
        }
        if(ctKilled == ctTotal) {
            this.endRound(room_id, Team.TERRORIST);
        } else if(tKilled == tTotal) {
            this.endRound(room_id, Team.COUNTER_TERRORIST);
        }
    }

    resetPlayerStats(room: Room) {
        for(let userId in room.users) {
            let user = room.users[userId];
            user.pos_x = user.spawn.x;
            user.pos_y = user.spawn.y;
            user.angle = user.spawn.angle;
            user.health = GAMECONSTANTS.MAX_HEALTH
            user.isAlive = true;
        }
    }

    endRound(room_id: string, winner: Team) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }

        let room = this.rooms[room_id];
        room.rounds[room.current_round - 1].winner = winner;

        this.broadcastEndRound(room_id);
    }

    broadcastEndRound(room_id: string) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        for(let socket of this.socketRooms[room_id]) {
            socket.send(JSON.stringify({
                event_name: 'END_ROUND',
                winner: room.rounds[room.current_round - 1].winner
            }))
        }

        setTimeout(() => {
            this.broadcastRoomData(room, this.socketRooms[room_id]);
        }, 5000)
    }

    broadcastRoomData(room: Room, socketRoom: IWebSocket[]) {
        this.resetPlayerStats(room);
        this.updateRoundData(room);
        for(let socket of socketRoom) {
            socket.send(JSON.stringify({
                event_name: "ROOM_DATA",
                room: room
            }))
        }
    }
}
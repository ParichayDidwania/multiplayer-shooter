import { ConnectionStatus, GAMECONSTANTS, Half, Room, Rooms, SPAWNS, Shot, SpawnPoint, State, Team, User, bombCoords } from "../dtos/engine.dto";
import { IWebSocket } from "./socket.service";

export class Engine {
    private rooms: Rooms = {};
    socketRooms: Record<string, Array<IWebSocket>>

    constructor(socketRooms: Record<string, Array<IWebSocket>>) {
        this.socketRooms = socketRooms;
    }

    createRoomData(room_id: string) {
        let room : Room = {
            room_id: room_id,
            state: State.CREATED,
            users: {},
            rounds: [],
            isBombPlanted: false,
            spawnPoints: JSON.parse(JSON.stringify(SPAWNS)),
            current_round: 0,
            current_round_start_timestamp: 0,
            current_round_bomb_plant_timestamp: 0,
            bomb: {
                isPicked: {
                    value: false
                },
                isPlanted: false,
                x: bombCoords.x,
                y: bombCoords.y,
                isDiffused: false,
                isExploded: false
            },
            half: Half.FIRST_HALF
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

        if(room.state != State.CREATED) {
            throw new Error('Cant join after match start');
        }

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

    resetSpawns(room: Room) {
        for(let point of room.spawnPoints.COUNTER_TERRORIST) {
            delete point.by
            point.isTaken = false;
        }

        for(let point of room.spawnPoints.TERRORIST) {
            delete point.by
            point.isTaken = false;
        }        
    }

    switchTeams(room: Room) {
        for(let uid in room.users) {
            let user = room.users[uid];
            let team = Team.NONE
            if(user.team == Team.COUNTER_TERRORIST) {
                team = Team.TERRORIST;
            } else {
                team = Team.COUNTER_TERRORIST;
            }

            user.team = Team.NONE;
            this.joinTeam(room.room_id, uid, team);
        }   
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

        let room = this.createRoomData(room_id);
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
    }

    updateRoundData(room: Room, room_id: string) {
        room.current_round += 1;
        room.rounds.push({ id: room.current_round, half: room.half });
        room.current_round_start_timestamp = new Date().getTime();
        this.startRoundTimer(room, room_id)
    }

    startRoundTimer(room: Room, room_id: string) {
        room.timer = setTimeout(() => {
            this.endRound(room_id, Team.COUNTER_TERRORIST);
        }, GAMECONSTANTS.ROUND_TIME * 1000)
    }

    startBombTimer(room: Room, room_id: string) {
        room.timer = setTimeout(() => {
            room.bomb.isExploded = true;
            this.endRound(room_id, Team.TERRORIST);
        }, GAMECONSTANTS.BOMB_TIMER * 1000)
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

            let isAdmin = room.users[uid].isAdmin;
            delete room.users[uid];       

            if(isAdmin) {
                let adminFound = false;
                for(let userId in room.users) {
                    let user = room.users[userId];
                    user.isAdmin = true;
                    adminFound = true;
                    break;
                }

                if(!adminFound) {
                    delete this.rooms[room_id];
                }
            }
        } else {
            room.users[uid].status = ConnectionStatus.DISCONNECTED;
            let total = 0;
            let disconnected = 0;
            for(let uid in room.users) {
                let user = room.users[uid];
                total++;
                if(user.status == ConnectionStatus.DISCONNECTED) {
                    disconnected++;
                }
            }

            if(total == disconnected) {
                clearTimeout(room.timer);
                delete this.rooms[room.room_id];
            }
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

        return room.users[uid].team;
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
                if(room.bomb.isPicked.value && room.bomb.isPicked.by == enemyUid) {
                    room.bomb.x = enemy.pos_x;
                    room.bomb.y = enemy.pos_y;
                    this.broadcastBombDropped(room_id, enemyUid);
                }
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
        } else if(tKilled == tTotal && !room.bomb.isPlanted) {
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
        room.bomb = {
            isPicked: {
                value: false
            },
            isPlanted: false,
            x: bombCoords.x,
            y: bombCoords.y,
            isDiffused: false,
            isExploded: false
        }

        room.current_round_bomb_plant_timestamp = 0;
        room.current_round_start_timestamp = 0;
    }

    endRound(room_id: string, winner: Team) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }

        let room = this.rooms[room_id];
        if(room.rounds[room.current_round - 1] && !room.rounds[room.current_round - 1].winner) {
            room.rounds[room.current_round - 1].winner = winner;
            clearTimeout(room.timer);
            this.broadcastEndRound(room_id);
        }
    }

    pickBomb(room_id: string, uid: string) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }

        let room = this.rooms[room_id];

        if(!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }

        if(room.users[uid].team != Team.TERRORIST) {
            return;
        }

        if(room.bomb.isPicked.value || room.bomb.isPlanted) {
            return;
        }

        room.bomb.isPicked = {
            value: true,
            by: uid
        }

        this.broadcastBombPicked(room_id);
    }

    broadcastBombPicked(room_id: string) {
        let room = this.rooms[room_id];
        for(let socket of this.socketRooms[room_id]) {
            socket.send(JSON.stringify({
                event_name: 'BOMB_PICKED',
                uid: room.bomb.isPicked.by
            }))
        }
    }

    dropBomb(room_id: string, uid: string) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }

        let room = this.rooms[room_id];

        if(!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }

        if(room.users[uid].team != Team.TERRORIST) {
            return;
        }

        if(!room.bomb.isPicked.value && room.bomb.isPlanted) {
            return;
        }

        if(room.bomb.isPicked.by != uid) {
            return;
        }

        room.bomb.isPicked = {
            value: false
        }
        room.bomb.x = room.users[uid].pos_x;
        room.bomb.y = room.users[uid].pos_y;
        
        this.broadcastBombDropped(room_id, uid);
    }

    plantBomb(room_id: string, uid: string) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }

        let room = this.rooms[room_id];

        if(!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }

        if(room.users[uid].team != Team.TERRORIST) {
            return;
        }

        if(!room.bomb.isPicked.value || room.bomb.isPlanted) {
            return;
        }

        if(room.bomb.isPicked.by != uid) {
            return;
        }

        room.bomb.isPicked = {
            value: false
        }

        room.bomb.x = room.users[uid].pos_x;
        room.bomb.y = room.users[uid].pos_y;
        room.bomb.isPlanted = true;

        clearTimeout(room.timer);
        room.current_round_bomb_plant_timestamp = new Date().getTime();
        this.broadcastBombPlanted(room_id, uid);
    }

    diffuseBomb(room_id: string, uid: string) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }

        let room = this.rooms[room_id];

        if(!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }

        if(room.users[uid].team != Team.COUNTER_TERRORIST) {
            return;
        }

        if(!room.bomb.isPlanted) {
            return;
        }

        room.bomb.isDiffused = true;
        clearTimeout(room.timer);
        this.broadcastBombDiffused(room_id)
    }

    broadcastBombDropped(room_id: string, uid: string) {
        let room = this.rooms[room_id];
        for(let socket of this.socketRooms[room_id]) {
            socket.send(JSON.stringify({
                event_name: 'BOMB_DROPPED',
                uid: uid,
                x: room.bomb.x,
                y: room.bomb.y
            }))
        }
    }

    reconnect(room_id: string, uid: string) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }

        let room = this.rooms[room_id];

        if(!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }

        let user = room.users[uid];
        user.status = ConnectionStatus.CONNECTED;
    }

    broadcastBombPlanted(room_id: string, uid: string) {
        let room = this.rooms[room_id];
        this.startBombTimer(room, room_id);
        for(let socket of this.socketRooms[room_id]) {
            socket.send(JSON.stringify({
                event_name: 'BOMB_PLANTED',
                uid: uid,
                x: room.bomb.x,
                y: room.bomb.y,
                time_left: Math.floor((room.current_round_bomb_plant_timestamp + (GAMECONSTANTS.BOMB_TIMER * 1000) - new Date().getTime())/1000)
            }))
        }
    }

    broadcastBombDiffused(room_id: string) {
        for(let socket of this.socketRooms[room_id]) {
            socket.send(JSON.stringify({
                event_name: 'BOMB_DIFFUSED',
            }))
        }
        this.endRound(room_id, Team.COUNTER_TERRORIST);
    }

    getMatchWinner(room: Room) {
        let ctWins = 0;
        let tWins = 0;
        if(room.half == Half.FIRST_HALF) {
            for(let round of room.rounds) {
                if(round.winner == Team.COUNTER_TERRORIST) {
                    ctWins++;
                } else if (round.winner == Team.TERRORIST) {
                    tWins++;
                }
            }
        } else {
            for(let round of room.rounds) {
                if(round.winner == Team.COUNTER_TERRORIST) {
                    round.half == Half.FIRST_HALF ? tWins++ : ctWins++
                } else if (round.winner == Team.TERRORIST) {
                    round.half == Half.FIRST_HALF ? ctWins++ : tWins++
                }
            }
        }
        
        let isMatchEnded = false;
        let winner = Team.NONE;

        if(ctWins == GAMECONSTANTS.MAX_ROUNDS) {
            isMatchEnded = true;
            winner = Team.COUNTER_TERRORIST;
        }

        if(tWins == GAMECONSTANTS.MAX_ROUNDS) {
            isMatchEnded = true;
            winner = Team.TERRORIST;
        }

        if(room.rounds.length == GAMECONSTANTS.SWITCH_SIDE_ROUND) {
            room.half = Half.SECOND_HALF;
            this.resetSpawns(room);
            this.switchTeams(room)
        }

        return { isMatchEnded, winner };
    }

    broadcastEndRound(room_id: string) {
        if(!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        for(let socket of this.socketRooms[room_id]) {
            socket.send(JSON.stringify({
                event_name: 'END_ROUND',
                winner: room.rounds[room.current_round - 1].winner,
                isExploded: room.bomb.isExploded
            }))
        }

        setTimeout(() => {
            let { isMatchEnded, winner } = this.getMatchWinner(room);
            if(isMatchEnded) {
                room.state = State.MATCH_ENDED
                this.broadcastMatchEnd(room_id, winner);
            } else {
                this.broadcastRoomData(room_id);
            }
        }, 5000)
    }

    public broadcastRoomData(room_id: string) {
        let room = this.getRoomData(room_id);
        this.resetPlayerStats(room);
        if(room.state == State.MATCH_STARTED) {
            this.updateRoundData(room, room_id);
        }
        let parsedRoom = { ...room };
        parsedRoom.timer = undefined;
        for(let socket of this.socketRooms[room_id]) {
            socket.send(JSON.stringify({
                event_name: "ROOM_DATA",
                room: parsedRoom,
                time_left: Math.floor((room.current_round_start_timestamp + (GAMECONSTANTS.ROUND_TIME * 1000) - new Date().getTime())/1000)
            }))
        }
    }

    public sendRoomData(room_id: string, socket: IWebSocket) {
        let room = this.getRoomData(room_id);
        let parsedRoom = { ...room };
        parsedRoom.timer = undefined;
        socket.send(JSON.stringify({
            event_name: "RECONNECT",
            room: parsedRoom,
            round_timer: GAMECONSTANTS.ROUND_TIME,
            bomb_timer: GAMECONSTANTS.BOMB_TIMER
        }))   
    }

    public broadcastMatchEnd(room_id: string, winner: Team) {
        for(let socket of this.socketRooms[room_id]) {
            socket.send(JSON.stringify({
                event_name: "END_MATCH",
                winner: winner
            }))
        }

        setTimeout(() => {
            delete this.rooms[room_id];
        }, 5000)
    }
}
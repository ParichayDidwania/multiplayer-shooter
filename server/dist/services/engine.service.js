"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Engine = void 0;
const engine_dto_1 = require("../dtos/engine.dto");
class Engine {
    constructor(socketRooms) {
        this.rooms = {};
        this.socketRooms = socketRooms;
    }
    createRoomData(room_id) {
        let room = {
            room_id: room_id,
            state: engine_dto_1.State.CREATED,
            users: {},
            rounds: [],
            isBombPlanted: false,
            spawnPoints: JSON.parse(JSON.stringify(engine_dto_1.SPAWNS)),
            current_round: 0,
            current_round_start_timestamp: 0,
            current_round_bomb_plant_timestamp: 0,
            bomb: {
                isPicked: {
                    value: false
                },
                isPlanted: false,
                x: engine_dto_1.bombCoords.x,
                y: engine_dto_1.bombCoords.y,
                isDiffused: false,
                isExploded: false
            },
            half: engine_dto_1.Half.FIRST_HALF
        };
        return room;
    }
    checkIfRoomExists(room_id) {
        let room = this.rooms[room_id];
        return room != undefined;
    }
    checkIfUserExists(room, uid) {
        let user = room.users[uid];
        return user != undefined;
    }
    addUserToRoom(room_id, uid, isAdmin = false) {
        if (!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        if (room.state != engine_dto_1.State.CREATED) {
            throw new Error('Cant join after match start');
        }
        if (this.checkIfUserExists(room, uid)) {
            throw new Error('This Username already exists in the room');
        }
        let user = {
            uid: uid,
            pos_x: -1,
            pos_y: -1,
            angle: 0,
            health: engine_dto_1.GAMECONSTANTS.MAX_HEALTH,
            team: engine_dto_1.Team.NONE,
            isAlive: true,
            isAdmin: isAdmin,
            status: engine_dto_1.ConnectionStatus.CONNECTED,
            shots: [],
            spawn: {
                x: -1,
                y: -1,
                angle: 0
            },
            kills: 0,
            deaths: 0
        };
        room.users[uid] = user;
    }
    resetSpawns(room) {
        for (let point of room.spawnPoints.COUNTER_TERRORIST) {
            delete point.by;
            point.isTaken = false;
        }
        for (let point of room.spawnPoints.TERRORIST) {
            delete point.by;
            point.isTaken = false;
        }
    }
    switchTeams(room) {
        for (let uid in room.users) {
            let user = room.users[uid];
            let team = engine_dto_1.Team.NONE;
            if (user.team == engine_dto_1.Team.COUNTER_TERRORIST) {
                team = engine_dto_1.Team.TERRORIST;
            }
            else {
                team = engine_dto_1.Team.COUNTER_TERRORIST;
            }
            user.team = engine_dto_1.Team.NONE;
            this.joinTeam(room.room_id, uid, team);
        }
    }
    joinTeam(room_id, uid, team) {
        if (team == engine_dto_1.Team.NONE) {
            throw new Error('Invalid team selected!');
        }
        if (!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        if (!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }
        let user = room.users[uid];
        if (user.team != engine_dto_1.Team.NONE) {
            throw new Error('You have already selected a team');
        }
        user.team = team;
        let pointFound = false;
        for (let i = 0; i < room.spawnPoints[team].length; i++) {
            let point = room.spawnPoints[team][i];
            if (!point.isTaken) {
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
        if (!pointFound) {
            throw new Error('No spawn point available');
        }
        let pos = {
            x: user.pos_x,
            y: user.pos_y,
            angle: user.angle
        };
        return pos;
    }
    createRoom(room_id, uid) {
        if (this.checkIfRoomExists(room_id)) {
            throw new Error('Room Already Exists');
        }
        let room = this.createRoomData(room_id);
        this.rooms[room_id] = room;
        setTimeout(() => {
            this.deleteRoom(room);
        }, 15 * 60 * 1000);
        this.addUserToRoom(room_id, uid, true);
    }
    getRoomData(room_id) {
        return this.rooms[room_id];
    }
    startMatch(room_id, uid) {
        if (!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        if (!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }
        let user = room.users[uid];
        if (!user.isAdmin) {
            throw new Error('Only the admin can start the match');
        }
        let isCT = false;
        let isT = false;
        for (let user_id in room.users) {
            isCT = isCT ? isCT : room.users[user_id].team == engine_dto_1.Team.COUNTER_TERRORIST;
            isT = isT ? isT : room.users[user_id].team == engine_dto_1.Team.TERRORIST;
            if (isCT && isT) {
                break;
            }
        }
        if (!isCT || !isT) {
            throw new Error('Atleast 1 user should be on both teams to start the match');
        }
        room.state = engine_dto_1.State.MATCH_STARTED;
    }
    updateRoundData(room, room_id) {
        room.current_round += 1;
        room.rounds.push({ id: room.current_round, half: room.half });
        room.current_round_start_timestamp = new Date().getTime();
        this.startRoundTimer(room, room_id);
    }
    startRoundTimer(room, room_id) {
        room.timer = setTimeout(() => {
            try {
                this.endRound(room_id, engine_dto_1.Team.COUNTER_TERRORIST);
            }
            catch (e) { }
            ;
        }, engine_dto_1.GAMECONSTANTS.ROUND_TIME * 1000);
    }
    startBombTimer(room, room_id) {
        room.timer = setTimeout(() => {
            try {
                room.bomb.isExploded = true;
                this.endRound(room_id, engine_dto_1.Team.TERRORIST);
            }
            catch (e) { }
        }, engine_dto_1.GAMECONSTANTS.BOMB_TIMER * 1000);
    }
    disconnectUser(room_id, uid) {
        if (!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        if (!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }
        if (room.state == engine_dto_1.State.CREATED) {
            let team = room.users[uid].team;
            if (team != engine_dto_1.Team.NONE) {
                for (let point of room.spawnPoints[team]) {
                    if (point.isTaken && point.by == uid) {
                        point.isTaken = false;
                        point.by = undefined;
                    }
                }
            }
            let isAdmin = room.users[uid].isAdmin;
            delete room.users[uid];
            if (isAdmin) {
                let adminFound = false;
                for (let userId in room.users) {
                    let user = room.users[userId];
                    user.isAdmin = true;
                    adminFound = true;
                    break;
                }
                if (!adminFound) {
                    this.deleteRoom(room);
                }
            }
        }
        else {
            room.users[uid].status = engine_dto_1.ConnectionStatus.DISCONNECTED;
            let total = 0;
            let disconnected = 0;
            for (let uid in room.users) {
                let user = room.users[uid];
                total++;
                if (user.status == engine_dto_1.ConnectionStatus.DISCONNECTED) {
                    disconnected++;
                }
            }
            if (total == disconnected) {
                this.deleteRoom(room);
            }
        }
    }
    updatePosition(room_id, uid, x, y, angle) {
        if (!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        if (!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }
        let user = room.users[uid];
        user.pos_x = x;
        user.pos_y = y;
        user.angle = angle;
        return user.team;
    }
    updateShots(room_id, uid, shotId, x, y, angle) {
        if (!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        if (!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }
        let shot = {
            id: shotId,
            x: x,
            y: y,
            angle: angle,
            timestamp: new Date().getTime()
        };
        let shots = room.users[uid].shots;
        if (shots.length >= engine_dto_1.GAMECONSTANTS.MAX_BULLET_BUFFER - 1) {
            shots.shift();
        }
        shots.push(shot);
        return room.users[uid].team;
    }
    validateHit(room_id, uid, enemyUid, shot_id) {
        if (!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        if (!this.checkIfUserExists(room, uid) || !this.checkIfUserExists(room, enemyUid)) {
            throw new Error('User or enemy doesnot exist in the room');
        }
        let currentTimeStamp = new Date().getTime();
        let shot = room.users[uid].shots.find(x => x.id == shot_id);
        if (!shot) {
            return;
        }
        let timeDifferenceMS = currentTimeStamp - shot.timestamp;
        let vx = Math.cos(shot.angle) * engine_dto_1.GAMECONSTANTS.BULLET_VELOCITY;
        let vy = Math.sin(shot.angle) * engine_dto_1.GAMECONSTANTS.BULLET_VELOCITY;
        let bulletCoords = {
            x: shot.x + (vx * timeDifferenceMS / 1000),
            y: shot.y + (vy * timeDifferenceMS / 1000)
        };
        let enemy = room.users[enemyUid];
        let dist = this.getDistanceBetweenPoints(bulletCoords.x, bulletCoords.y, enemy.pos_x, enemy.pos_y);
        if (dist <= engine_dto_1.GAMECONSTANTS.HIT_REG_RADIUS) {
            enemy.health -= engine_dto_1.GAMECONSTANTS.SHOT_DAMAGE;
            if (enemy.health <= 0) {
                room.users[uid].kills++;
                enemy.deaths++;
                enemy.isAlive = false;
                enemy.health = 0;
                if (room.bomb.isPicked.value && room.bomb.isPicked.by == enemyUid) {
                    room.bomb.x = enemy.pos_x;
                    room.bomb.y = enemy.pos_y;
                    room.bomb.isPicked = {
                        value: false
                    };
                    this.broadcastBombDropped(room_id, enemyUid);
                }
            }
            return { uid: enemyUid, team: enemy.team, health: enemy.health, isAlive: enemy.isAlive };
        }
    }
    getDistanceBetweenPoints(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    }
    checkRoundStatus(room_id) {
        let room = this.rooms[room_id];
        let ctKilled = 0;
        let tKilled = 0;
        let ctTotal = 0;
        let tTotal = 0;
        for (let userId in room.users) {
            let user = room.users[userId];
            switch (user.team) {
                case engine_dto_1.Team.COUNTER_TERRORIST:
                    if (!user.isAlive) {
                        ctKilled++;
                    }
                    ctTotal++;
                    break;
                case engine_dto_1.Team.TERRORIST:
                    if (!user.isAlive) {
                        tKilled++;
                    }
                    tTotal++;
                    break;
            }
        }
        if (ctKilled == ctTotal) {
            this.endRound(room_id, engine_dto_1.Team.TERRORIST);
        }
        else if (tKilled == tTotal && !room.bomb.isPlanted) {
            this.endRound(room_id, engine_dto_1.Team.COUNTER_TERRORIST);
        }
    }
    resetPlayerStats(room) {
        for (let userId in room.users) {
            let user = room.users[userId];
            user.pos_x = user.spawn.x;
            user.pos_y = user.spawn.y;
            user.angle = user.spawn.angle;
            user.health = engine_dto_1.GAMECONSTANTS.MAX_HEALTH;
            user.isAlive = true;
            user.shots = [];
        }
        room.bomb = {
            isPicked: {
                value: false
            },
            isPlanted: false,
            x: engine_dto_1.bombCoords.x,
            y: engine_dto_1.bombCoords.y,
            isDiffused: false,
            isExploded: false
        };
        room.current_round_bomb_plant_timestamp = 0;
        room.current_round_start_timestamp = 0;
    }
    endRound(room_id, winner) {
        if (!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        if (room.rounds[room.current_round - 1] && !room.rounds[room.current_round - 1].winner) {
            room.rounds[room.current_round - 1].winner = winner;
            clearTimeout(room.timer);
            this.broadcastEndRound(room_id);
        }
    }
    pickBomb(room_id, uid) {
        if (!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        if (!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }
        if (room.users[uid].team != engine_dto_1.Team.TERRORIST) {
            return;
        }
        if (room.bomb.isPicked.value || room.bomb.isPlanted) {
            return;
        }
        room.bomb.isPicked = {
            value: true,
            by: uid
        };
        this.broadcastBombPicked(room_id);
    }
    broadcastBombPicked(room_id) {
        let room = this.rooms[room_id];
        let picked = JSON.stringify({
            eventName: 'BOMB_PICKED',
            uid: room.bomb.isPicked.by
        });
        for (let socket of this.socketRooms[room_id]) {
            socket.send(picked);
        }
    }
    dropBomb(room_id, uid) {
        if (!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        if (!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }
        if (room.users[uid].team != engine_dto_1.Team.TERRORIST) {
            return;
        }
        if (!room.bomb.isPicked.value && room.bomb.isPlanted) {
            return;
        }
        if (room.bomb.isPicked.by != uid) {
            return;
        }
        room.bomb.isPicked = {
            value: false
        };
        room.bomb.x = room.users[uid].pos_x;
        room.bomb.y = room.users[uid].pos_y;
        this.broadcastBombDropped(room_id, uid);
    }
    plantBomb(room_id, uid) {
        if (!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        if (!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }
        if (room.users[uid].team != engine_dto_1.Team.TERRORIST) {
            return;
        }
        if (!room.bomb.isPicked.value || room.bomb.isPlanted) {
            return;
        }
        if (room.bomb.isPicked.by != uid) {
            return;
        }
        room.bomb.isPicked = {
            value: false
        };
        room.bomb.x = room.users[uid].pos_x;
        room.bomb.y = room.users[uid].pos_y;
        room.bomb.isPlanted = true;
        clearTimeout(room.timer);
        room.current_round_bomb_plant_timestamp = new Date().getTime();
        this.broadcastBombPlanted(room_id, uid);
    }
    diffuseBomb(room_id, uid) {
        if (!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        if (!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }
        if (room.users[uid].team != engine_dto_1.Team.COUNTER_TERRORIST) {
            return;
        }
        if (!room.bomb.isPlanted) {
            return;
        }
        room.bomb.isDiffused = true;
        clearTimeout(room.timer);
        this.broadcastBombDiffused(room_id);
    }
    broadcastBombDropped(room_id, uid) {
        let room = this.rooms[room_id];
        let dropped = JSON.stringify({
            eventName: 'BOMB_DROPPED',
            uid: uid,
            x: room.bomb.x,
            y: room.bomb.y
        });
        for (let socket of this.socketRooms[room_id]) {
            socket.send(dropped);
        }
    }
    reconnect(room_id, uid) {
        if (!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        if (!this.checkIfUserExists(room, uid)) {
            throw new Error('User doesnot exist in the room');
        }
        let user = room.users[uid];
        user.status = engine_dto_1.ConnectionStatus.CONNECTED;
    }
    broadcastBombPlanted(room_id, uid) {
        let room = this.rooms[room_id];
        this.startBombTimer(room, room_id);
        let planted = JSON.stringify({
            eventName: 'BOMB_PLANTED',
            uid: uid,
            x: room.bomb.x,
            y: room.bomb.y,
            time_left: Math.floor((room.current_round_bomb_plant_timestamp + (engine_dto_1.GAMECONSTANTS.BOMB_TIMER * 1000) - new Date().getTime()) / 1000)
        });
        for (let socket of this.socketRooms[room_id]) {
            socket.send(planted);
        }
    }
    broadcastBombDiffused(room_id) {
        let defused = JSON.stringify({
            eventName: 'BOMB_DIFFUSED',
        });
        for (let socket of this.socketRooms[room_id]) {
            socket.send(defused);
        }
        this.endRound(room_id, engine_dto_1.Team.COUNTER_TERRORIST);
    }
    getMatchWinner(room) {
        let ctWins = 0;
        let tWins = 0;
        if (room.half == engine_dto_1.Half.FIRST_HALF) {
            for (let round of room.rounds) {
                if (round.winner == engine_dto_1.Team.COUNTER_TERRORIST) {
                    ctWins++;
                }
                else if (round.winner == engine_dto_1.Team.TERRORIST) {
                    tWins++;
                }
            }
        }
        else {
            for (let round of room.rounds) {
                if (round.winner == engine_dto_1.Team.COUNTER_TERRORIST) {
                    round.half == engine_dto_1.Half.FIRST_HALF ? tWins++ : ctWins++;
                }
                else if (round.winner == engine_dto_1.Team.TERRORIST) {
                    round.half == engine_dto_1.Half.FIRST_HALF ? ctWins++ : tWins++;
                }
            }
        }
        let isMatchEnded = false;
        let winner = engine_dto_1.Team.NONE;
        if (ctWins == engine_dto_1.GAMECONSTANTS.MAX_ROUNDS) {
            isMatchEnded = true;
            winner = engine_dto_1.Team.COUNTER_TERRORIST;
        }
        if (tWins == engine_dto_1.GAMECONSTANTS.MAX_ROUNDS) {
            isMatchEnded = true;
            winner = engine_dto_1.Team.TERRORIST;
        }
        if (room.rounds.length == engine_dto_1.GAMECONSTANTS.SWITCH_SIDE_ROUND) {
            room.half = engine_dto_1.Half.SECOND_HALF;
            this.resetSpawns(room);
            this.switchTeams(room);
        }
        return { isMatchEnded, winner };
    }
    broadcastEndRound(room_id) {
        if (!this.checkIfRoomExists(room_id)) {
            throw new Error('Room does not exist');
        }
        let room = this.rooms[room_id];
        let endRound = JSON.stringify({
            eventName: 'END_ROUND',
            winner: room.rounds[room.current_round - 1].winner,
            isExploded: room.bomb.isExploded
        });
        for (let socket of this.socketRooms[room_id]) {
            socket.send(endRound);
        }
        setTimeout(() => {
            try {
                let { isMatchEnded, winner } = this.getMatchWinner(room);
                if (isMatchEnded) {
                    room.state = engine_dto_1.State.MATCH_ENDED;
                    this.broadcastMatchEnd(room_id, winner);
                }
                else {
                    this.broadcastRoomData(room_id);
                }
            }
            catch (e) { }
        }, 5000);
    }
    broadcastRoomData(room_id) {
        let room = this.getRoomData(room_id);
        if (room) {
            this.resetPlayerStats(room);
            if (room.state == engine_dto_1.State.MATCH_STARTED) {
                this.updateRoundData(room, room_id);
            }
            let parsedRoom = Object.assign({}, room);
            parsedRoom.timer = undefined;
            let rd = JSON.stringify({
                eventName: "ROOM_DATA",
                room: parsedRoom,
                time_left: Math.floor((room.current_round_start_timestamp + (engine_dto_1.GAMECONSTANTS.ROUND_TIME * 1000) - new Date().getTime()) / 1000)
            });
            for (let socket of this.socketRooms[room_id]) {
                socket.send(rd);
            }
        }
    }
    sendRoomData(room_id, socket) {
        let room = this.getRoomData(room_id);
        let parsedRoom = Object.assign({}, room);
        parsedRoom.timer = undefined;
        socket.send(JSON.stringify({
            eventName: "RECONNECT",
            room: parsedRoom,
            round_timer: engine_dto_1.GAMECONSTANTS.ROUND_TIME,
            bomb_timer: engine_dto_1.GAMECONSTANTS.BOMB_TIMER
        }));
    }
    broadcastMatchEnd(room_id, winner) {
        let matchEnd = JSON.stringify({
            eventName: "END_MATCH",
            winner: winner
        });
        for (let socket of this.socketRooms[room_id]) {
            socket.send(matchEnd);
        }
        setTimeout(() => {
            this.deleteRoom(this.rooms[room_id]);
        }, 5000);
    }
    deleteRoom(room) {
        clearTimeout(room.timer);
        room.state = engine_dto_1.State.MATCH_ENDED;
        delete this.rooms[room.room_id];
        delete this.socketRooms[room.room_id];
    }
}
exports.Engine = Engine;

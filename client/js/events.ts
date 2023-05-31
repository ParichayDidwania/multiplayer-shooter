import { bombDiffused, bombDropped, bombPicked, bombPlanted, isInit, reconnectGame, renderBullets, renderMatchWinner, renderPlayer, renderRoundWinner, startGame, updateHealth } from "./client";

export class Events {
    socket: WebSocket;
    uid: string;
    room_id: string;
    team: string = 'NONE';
    constructor(socket: WebSocket, uid: string) {
        this.socket = socket;
        console.log(this.socket);
        this.uid = uid;
        this.room_id = '';

        this.setMenu();
    }

    handleEvents(event: any) {
        if(event.event_name != 'POSITION') {
            console.log(event);
        }
        switch(event.event_name) {
            case 'ERROR':
                alert(event.message);
                break;

            case 'SELECT_TEAM':
                this.unsetMenu();
                this.setTeamSelection();
                break;

            case 'ROOM_DATA':
                if(this.team != 'NONE') {
                    this.unsetTeamSelection();
                    this.setPreMatchData(event.room, event.time_left);
                }
                break;

            case 'POSITION':
                if(event.uid != this.uid && isInit()) {
                    renderPlayer(event.uid, event.x, event.y, event.angle, event.team);
                }
                break;

            case 'SHOOT':
                if(event.uid != this.uid && isInit()) {
                    renderBullets(event.x, event.y, event.angle, event.uid, event.team);
                }
                break;
            
            case 'HEALTH':
                if(isInit()) {
                    updateHealth(event.uid, event.team, event.health, event.isAlive);
                }
                break;

            case 'END_ROUND':
                renderRoundWinner(event.winner, event.isExploded);
                break;

            case 'END_MATCH':
                renderMatchWinner(event.winner);
                break;

            case 'BOMB_PICKED':
                bombPicked(event.uid);
                break;

            case 'BOMB_DROPPED':
                bombDropped(event.uid, event.x, event.y);
                break;

            case 'BOMB_PLANTED':
                bombPlanted(event.uid, event.x, event.y, event.time_left);
                break;

            case 'BOMB_DIFFUSED':
                bombDiffused();
                break;

            case 'RECONNECT':
                this.unsetMenu();
                let user = event.room.users[this.uid]
                let spawn = {
                    pos_x: user.pos_x,
                    pos_y: user.pos_y,
                    angle: user.angle
                }
                let score = this.calculateMatchScore(event.room);
                this.team = user.team;
                reconnectGame(event.room, spawn, this.team, event.room.users, score, event.room.bomb, event.round_timer, event.bomb_timer);
                break;
        }
    }

    // ws
    sendCreateRoom() {
        let room_id: any = document.getElementById('room_id');
        this.room_id = room_id.value;
        this.socket.send(JSON.stringify({
            event_name: "CREATE",
            uid: this.uid,
            room_id: room_id.value
        }))
    }

    sendJoinTeam(team: string) {
        this.team = team;
        this.socket.send(JSON.stringify({
            event_name: "SELECTED_TEAM",
            uid: this.uid,
            room_id: this.room_id,
            team: team
        }))
    }

    sendJoinRoom() {
        let room_id: any = document.getElementById('room_id');
        this.room_id = room_id.value;
        this.socket.send(JSON.stringify({
            event_name: "JOIN",
            uid: this.uid,
            room_id: this.room_id
        }))
    }

    sendReconnectRoom() {
        let room_id: any = document.getElementById('room_id');
        this.room_id = room_id.value;
        this.socket.send(JSON.stringify({
            event_name: "RECONNECT",
            uid: this.uid,
            room_id: this.room_id
        }))
    }

    sendStartMatch() {
        console.log('here');
        this.socket.send(JSON.stringify({
            event_name: "START_MATCH",
        }))
    }

    //ws
    setMenu() {
        let div : any = document.getElementById('menu');
        div.style.visibility = 'visible';
        div.innerHTML = `<b>Room Id: </b><input id='room_id' type ='text' value='room123'>
        <button id='createBtn'style = 'background-color: green;'>Create</button>
        <button id='joinBtn'style = 'background-color: yellow;'>Join</button>
        <button id='reconnectBtn'style = 'background-color: blue;'>Reconnect</button>`

        let createBtn: any = document.getElementById('createBtn');
        let joinBtn: any = document.getElementById('joinBtn');
        let reconnectBtn: any = document.getElementById('reconnectBtn');

        createBtn.onclick = this.sendCreateRoom.bind(this);
        joinBtn.onclick = this.sendJoinRoom.bind(this);
        reconnectBtn.onclick = this.sendReconnectRoom.bind(this);
    }

    unsetMenu() {
        let div : any = document.getElementById('menu');
        div.innerHTML = '';
        div.style.visibility = 'hidden';
    }

    setTeamSelection() {
        let fieldSet : any = document.getElementById('team-selection');
        fieldSet.style.visibility = 'visible';
        fieldSet.innerHTML = `<fieldset><legend>Select A Team</legend>
        <button id="teamSelectTBtn">Terrorist</button>
        <button id="teamSelectCTBtn">Counter Terrorist</button></fieldset>`

        let createBtnT: any = document.getElementById('teamSelectTBtn');
        createBtnT.onclick = this.sendJoinTeam.bind(this, 'TERRORIST');

        let createBtnCT: any = document.getElementById('teamSelectCTBtn');
        createBtnCT.onclick = this.sendJoinTeam.bind(this, 'COUNTER_TERRORIST');
    }

    unsetTeamSelection() {
        let fieldSet : any = document.getElementById('team-selection');
        fieldSet.style.visibility = 'hidden';
        fieldSet.innerHTML = ``
    }

    setPreMatchData(room: any, time_left: number) {
        if(room.state == 'MATCH_STARTED') {
            this.unsetPreMatchData();
            let user = room.users[this.uid]
            let spawn = {
                pos_x: user.pos_x,
                pos_y: user.pos_y,
                angle: user.angle
            }
            let score = this.calculateMatchScore(room);
            this.team = user.team;
            startGame(spawn, this.team, room.users, score, time_left, room.bomb);
        } else if (room.state == 'CREATED') {
            let div : any = document.getElementById('pre-match');
            let playerList = '';
            let usernames = Object.keys(room.users);
            let adminUser = '';
            for(let i = 0; i < usernames.length; i++) {
                if(i == 0) {
                    playerList += '<ul>'
                }
                let adminText = '';
                if(room.users[usernames[i]].isAdmin) {
                    adminText = room.users[usernames[i]].isAdmin ? ' (Admin)' : '';
                    adminUser = usernames[i];
                }

                if(usernames[i] == this.uid) {
                    this.team = room.users[usernames[i]].team;
                }
                
                let team = room.users[usernames[i]].team;
                playerList += `<li>${usernames[i]}${adminText} - Team : ${team}</li>`
    
                if(i == usernames.length - 1) {
                    playerList += '</ul>'
                } 
            }
            div.innerHTML = `<fieldset><legend>Lobby Stats</legend>
            <p>PLAYERS JOINED : ${Object.keys(room.users).length}</p>
            <p>PLAYER LIST</p>${playerList}`
    
            if(adminUser == this.uid) {
                div.innerHTML += `<button id="start">START MATCH</button>`
            }
    
            div.innerHTML += `</fieldset>`
    
            let startMatchBtn : any = document.getElementById('start');
            if(startMatchBtn) {
                startMatchBtn.onclick = this.sendStartMatch.bind(this);
            }
        }
    }

    unsetPreMatchData() {
        let div : any = document.getElementById('pre-match');
        div.innerHTML = '';
        div.style.visibility = 'hidden';
    }

    calculateMatchScore(room: any) {
        let score: any = {
            TERRORIST: 0,
            COUNTER_TERRORIST: 0
        }
        if(room.half == 1) {
            for(let round of room.rounds) {
                if(round.winner) {
                    score[round.winner]++;
                }
            }
        } else {
            for(let round of room.rounds) {
                if(round.winner) {
                    if(round.half == 1) {
                        let winner: any = Object.keys(score).find(x => x != round.winner);
                        score[winner]++;
                    } else {
                        score[round.winner]++;
                    }
                }
            }
        }
        

        return score;
    }
}
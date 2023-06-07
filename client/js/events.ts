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

        this.setMenu(true);
    }

    handleEvents(event: any) {
        if(event.event_name != 'POSITION') {
            console.log(event);
        }
        switch(event.event_name) {
            case 'ERROR':
                alert(event.message);
                break;

            case 'ROOM_DATA':
                this.unsetMenu();
                if(event.room.users[this.uid].team != 'NONE') {
                    this.team = event.room.users[this.uid].team;
                    this.setTeamSelection(event.room, event.time_left, false);
                } else {
                    this.setTeamSelection(event.room, event.time_left, true);
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
                    updateHealth(event.uid, event.team, event.health, event.isAlive, event.shooter);
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
    setMenu(isLoading = false) {
        let div : any = document.getElementById('menu');
        div.style.visibility = 'visible';
        div.innerHTML = `<img id="logo" src="./assets/sprites/logo.png">
        <div id="subMenu1">
            <span id="username"><span style="font-size: 2em;">username: </span><span style="font-size: 2em;color: red">${this.uid}</span></span><br>
            ${!isLoading ? "<input id='room_id' type ='text' value='', placeholder='Room Id'><br><button id='createBtn'>Create</button> <br><button id='joinBtn'>Join</button> <br><button id='reconnectBtn'>Reconnect</button> <br>" :  "<div class='loader'></div>" }
        </div>`

        div.style.backgroundImage = "url(/assets/sprites/background.jpg)";
        div.style.width = '100vw';
        div.style.height = '100vh'
        div.style.backgroundSize = '100vw 100vh'
        div.style.overflow = 'auto'

        if(!isLoading) {
            let createBtn: any = document.getElementById('createBtn');
            let joinBtn: any = document.getElementById('joinBtn');
            let reconnectBtn: any = document.getElementById('reconnectBtn');
    
            createBtn.onclick = this.sendCreateRoom.bind(this);
            joinBtn.onclick = this.sendJoinRoom.bind(this);
            reconnectBtn.onclick = this.sendReconnectRoom.bind(this);
        }
    }

    unsetMenu() {
        let div : any = document.getElementById('menu');
        div.innerHTML = '';
        div.removeAttribute("style");
        div.style.visibility = 'hidden';
    }

    getMembers(room: any) {
        let ctList = '';
        let tList = ''

        let isAdmin = false;

        for(let userId in room.users) {
            let user = room.users[userId];
            if(!isAdmin && userId == this.uid && user.isAdmin) {
                isAdmin = true;
            }
            if(user.team == 'COUNTER_TERRORIST') {
                ctList += `<li id="name" style="color: rgba(0, 150, 255);">${userId}</li>`
            } else if (user.team == 'TERRORIST') {
                tList += `<li id="name" style="color: rgba(255, 191, 0);">${userId}</li>`
            }
        }

        return { ctList, tList, isAdmin }
    }

    setTeamSelection(room: any, time_left: number, renderJoin: boolean) {
        if(room.state == 'CREATED') {
            let div : any = document.getElementById('team-selection');
            div.style.visibility = 'visible';
            let { ctList, tList, isAdmin } = this.getMembers(room);
            div.innerHTML = `<img id="logo" src="./assets/sprites/logo.png">
            <div id="parentSubMenu2">
                <div id="subMenu2">
                    <div id="ct">
                        <h2 style="color: rgba(0, 150, 255); text-align: center;">COUNTER TERRORIST</h2>
                        <ul>
                            ${ctList}
                        </ul>
                        ${renderJoin ? '<button id="teamJoinCT" style="background-color: rgba(0, 150, 255);"> JOIN </button>': ''}
                    </div>
                    <div id="t">
                        <h2 style="color: rgba(255, 191, 0); text-align: center;">TERRORIST</h2>
                        <ul>
                            ${tList}
                        </ul>
                        ${renderJoin ? '<button id="teamJoinT" style="background-color: rgba(255, 191, 0);"> JOIN </button>': ''}
                    </div>
                </div>
                ${isAdmin ? '<button id="startBtn">START</button>' : ''}
                <h1 style="text-align: center; color: white;"><span style="color: #FFFFFF; font-weight: 100">Room ID: </span><span style="color: #FFFFFF; font-family:Monospace;">${room.room_id}</span></h1>
            </div>`

            div.style.backgroundImage = "url(/assets/sprites/background.jpg)";
            div.style.width = '100vw';
            div.style.height = '100vh'
            div.style.backgroundSize = '100vw 100vh'
            div.style.overflow = 'auto'
    
            if(renderJoin) {
                let createBtnT: any = document.getElementById('teamJoinT');
                createBtnT.onclick = this.sendJoinTeam.bind(this, 'TERRORIST');
        
                let createBtnCT: any = document.getElementById('teamJoinCT');
                createBtnCT.onclick = this.sendJoinTeam.bind(this, 'COUNTER_TERRORIST');
            }
    
            if(isAdmin) {
                let startMatchBtn : any = document.getElementById('startBtn');
                startMatchBtn.onclick = this.sendStartMatch.bind(this);
            }
        } else if (room.state == 'MATCH_STARTED') {
            this.unsetTeamSelection();
            let user = room.users[this.uid]
            let spawn = {
                pos_x: user.pos_x,
                pos_y: user.pos_y,
                angle: user.angle
            }
            let score = this.calculateMatchScore(room);
            this.team = user.team;
            startGame(spawn, this.team, room.users, score, time_left, room.bomb);
        }
    }

    unsetTeamSelection() {
        let div : any = document.getElementById('team-selection');
        div.removeAttribute("style");
        div.style.visibility = 'hidden';
        div.innerHTML = ``
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
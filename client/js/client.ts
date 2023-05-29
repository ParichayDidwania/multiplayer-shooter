import Phaser, { Game } from "phaser";
import { Events } from "./events";

const playerSprite = 'assets/sprites/shooter2.png';
const bulletSprite = 'assets/sprites/bullet.png'

const MAX_BULLETS = 5;

let shot_id = 0;
let map_shot_id = 0;
let speed = 0.3;
let bulletMap: any = {};
let healthBar: any;
let isAlive = false;
let diag_speed = speed / 1.414
let player : any;
let wasd : any;
let enemies : any = {};
let allies : any = {};
let ws: any;
let username: string;
let isStarted = false;
let handle_angle = Math.PI/2;
let handle_distance = 16
let shapes: any;
let gun_angle = 0.34
let gun_distance = 48;
let bulletVelocity = 500;
let vision: any;
let event: Events;

let playerSpawn: any;
let playerTeam: string;

let initialPlayerData: any;
let interval: any;
let scoreBoard: any;
let roundTimeLeft: number;
let roundTimerInterval: any;
let bulletReloadAnimInterval: any;
let bulletLeft = MAX_BULLETS;
let reloadTimeout: any;
let bulletInfoLabel: any;
let reloadBtn: any;
class GameScene extends Phaser.Scene {
    constructor() {
        super({
            key: "GameScene"
        });
    }

    init(): void {
        // TODO
    }

    preload(): void {
        this.load.image('player', playerSprite);
        this.load.image('projectile', bulletSprite);
        this.load.image('projectile-ct', 'assets/sprites/bullet-ct.png')
        this.load.image('projectile-t', 'assets/sprites/bullet-t.png')
        this.load.json('shapes', 'assets/sprites/playerShape.json');
        this.load.image('tile', 'assets/sprites/wall.png')
        this.load.tilemapTiledJSON('map', 'assets/sprites/map2.json');
        this.load.image('vision', 'assets/sprites/mask.png');
        this.load.tilemapTiledJSON('floormap', 'assets/sprites/floor.json');
        this.load.image('floor', 'assets/sprites/floor.png');
        this.load.image('health', 'assets/sprites/health.png');
        this.load.image('tomb', 'assets/sprites/tomb.png')
        this.load.image('gun', 'assets/sprites/gun.png')
    }
      
    create(): void {
        const map = this.make.tilemap({ key: 'map' });
        const floorMap = this.make.tilemap({ key: 'floormap' });

        const floorset: any = floorMap.addTilesetImage('floor', 'floor');
        const tileset: any = map.addTilesetImage('wall', 'tile');

        const floorlayer: any = floorMap.createLayer('floormap', floorset);
        floorlayer.setDepth(-2);
        const layer: any = map.createLayer('Obs', tileset);
        map.setCollisionBetween(1, 1); 
        map.setCollisionByProperty({ collides: true });
        this.matter.world.convertTilemapLayer(layer)

        layer.forEachTile(function (tile: any) {
            if(tile.physics.matterBody) {
                tile.physics.matterBody.body.label = 'bounds'; 
            }
        });

        const rt = this.make.renderTexture({
            x: map.widthInPixels/2,
            y: map.heightInPixels/2,
            width: map.widthInPixels,
            height: map.heightInPixels
        }, true)

        rt.fill(0x000000, 1);
        rt.setTint(0x0a2948)
        rt.setDepth(50);

        shapes = this.cache.json.get('shapes');
        let bounds = this.matter.world.setBounds(map.widthInPixels, map.heightInPixels);
        Object.values(bounds.walls).forEach(o => o.label = 'bounds');

        player = createPlayer(username ?? "UNNAMED", Category.SELF, playerSpawn.pos_x, playerSpawn.pos_y, playerSpawn.angle, initialPlayerData[username].health);
        isAlive = true;
        healthBar = makeBar.call(this, 5, this.cameras.main.height - 100, 0xc0c0c0);
        makeScoreUI.call(this)
        gunUI.call(this);

        vision = this.add.image(player.x, player.y, 'vision').setOrigin(0.5, 0.5);
        vision.scale = 1;
        vision.setDepth(100);
        vision.setVisible(false)

        rt.mask = new Phaser.Display.Masks.BitmapMask(this, vision);
        rt.mask.invertAlpha = true

        
        this.matter.world.on('collisionstart', function (event: any, bodyA: any, bodyB: any) {
            if(bodyA.label == 'bounds' && bodyB.label == 'bullet') {
                delete bulletMap[bodyB.map_shot_id];
                bodyB.gameObject.destroy();
            } else if (bodyB.label == 'bullet' && bodyA.label == 'player') {
                if (bodyB.uid == username && bodyA.playerType == Label.ENEMY) {
                    sendHit(bodyA.uid, bodyB.shot_id);
                }

                if(bodyB.uid != bodyA.uid) {
                    delete bulletMap[bodyB.map_shot_id];
                    bodyB.gameObject.destroy();
                }
            }
        });

        this.cameras.main.startFollow(player);

        wasd = this.input.keyboard?.addKeys({ 'W': Phaser.Input.Keyboard.KeyCodes.W, 'S': Phaser.Input.Keyboard.KeyCodes.S, 'A': Phaser.Input.Keyboard.KeyCodes.A, 'D': Phaser.Input.Keyboard.KeyCodes.D });
        reloadBtn = this.input.keyboard?.addKeys({ 'R': Phaser.Input.Keyboard.KeyCodes.R });
        wasd.check_pressed_up = function () { return this.W.isDown };
        wasd.check_pressed_down = function () { return this.S.isDown };
        wasd.check_pressed_left = function () { return this.A.isDown };
        wasd.check_pressed_right = function () { return this.D.isDown };
        reloadBtn.isReloadPressed = function() { return this.R.isDown }

        this.input.on('pointermove',  (pointer: any) => {
            if(isAlive) {
                let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY);
                player.setRotation(angle);
            }
        }, this);

        this.input.on("pointerdown", (pointer: any) => {
            if(isAlive) {
                if(bulletLeft > 0) {
                    if (player.last_shot > 250 && player.active) {
                        shootPreprocess(player);
                        player.last_shot = 0;
                        bulletLeft--;
                        bulletInfoLabel.text = `${bulletLeft}/∞`
                    }
                } else if (!reloadTimeout) {
                    reload();
                }
            }
        }, this);

        renderInitialPlayers();

        interval = setInterval(() => {
            send_pose(player);
        }, 100)

        isStarted = true;
    }

    update(time: number, delta: number): void {
        if(isAlive) {
            var xMovement = 0;
            var yMovement = 0;
    
            xMovement = wasd.check_pressed_left() ? -1 : wasd.check_pressed_right() ? 1 : 0;
            yMovement = wasd.check_pressed_up() ? -1 : wasd.check_pressed_down() ? 1 : 0;
    
            if (xMovement != 0 && yMovement != 0) {
                player.x += (xMovement * diag_speed * delta);
                player.y += (yMovement * diag_speed * delta);
                
                let angle = Phaser.Math.Angle.Between(player.x, player.y, this.input.mousePointer.x + this.cameras.main.scrollX,  this.input.mousePointer.y + this.cameras.main.scrollY);
                player.setRotation(angle);
            } else {
                player.x += (xMovement * speed * delta);
                player.y += (yMovement * speed * delta);
                let angle = Phaser.Math.Angle.Between(player.x, player.y,  this.input.mousePointer.x + this.cameras.main.scrollX,  this.input.mousePointer.y + this.cameras.main.scrollY);
                player.setRotation(angle);
            }
            player.last_shot = player.last_shot + delta;
    
            if(player.label) {
                player.label.x = player.x;
                player.label.y = player.y - 60;
            }
    
            if(vision) {
                vision.x = player.x,
                vision.y = player.y
            }

            if(reloadBtn.isReloadPressed() && !reloadTimeout && bulletLeft != MAX_BULLETS) {
                reload();
            }
        }

        for(let bulletId in bulletMap) {
            bulletMap[bulletId].x += bulletMap[bulletId].body.velocityX * (delta/1000);
            bulletMap[bulletId].y += bulletMap[bulletId].body.velocityY * (delta/1000);
        }        
    }
};

function reload() {
    let dotArray = ['.', '..', '...']
    let i = 0;
    bulletReloadAnimInterval = setInterval(() => {
        let dot = '';
        if(i >= dotArray.length - 1) {
            i = 0;
        } else {
            i++;
        }
        dot = dotArray[i];
        bulletInfoLabel.text = `${dot}/∞`
    }, 250)
    reloadTimeout = setTimeout(() => {
        clearInterval(bulletReloadAnimInterval);
        bulletLeft = MAX_BULLETS;
        bulletInfoLabel.text = `${bulletLeft}/∞`
        reloadTimeout = undefined
    }, 3000)
}

function makeBar(this: any, x: number, y: number, color: number) {
    let bar = this.add.graphics();
    let healthImage = this.matter.add.image(x, y, 'health').setOrigin(0, 0).setScale(0.4, 0.4).setDepth(102).setScrollFactor(0, 0).setSensor(true);
    let topRight: any = healthImage.getTopRight();
    bar.fillStyle(color, 1);
    bar.fillRect(20, 0, 200, 50);
    bar.setScrollFactor(0, 0);
    bar.setDepth(101)
    bar.x = 50;
    bar.y = topRight.y + 25;
    return bar;
}


function setBarValue(bar: Phaser.GameObjects.Graphics, percentage: number) {
    bar.scaleX = percentage / 100;
}

function makeScoreUI(this: any) {
    let minute = Math.floor(roundTimeLeft / 60);
    let seconds: any = roundTimeLeft % 60;
    if(seconds <= 9) {
        seconds = `0${seconds}`
    }

    let midX = this.cameras.main.width / 2
    let scoreCardLength = 56;
    let timerLength = 50;
    let CTLabel = this.add.text(midX - scoreCardLength - timerLength, 10 ,`COUNTER-TERRORIST` ,{ color: '#0096FF', backgroundColor: 'rgba(0,0,0,0.5)', font: '2.5em' }).setOrigin(1, 0).setScrollFactor(0, 0).setDepth(104).setPadding(20);
    let CTScore = this.add.text(CTLabel.getTopRight().x, 10 ,`${scoreBoard.COUNTER_TERRORIST}` ,{ fontSize: 30, color: '#FFFFFF', backgroundColor: 'rgba(0,150,255,0.5)', font: '2.5em' }).setOrigin(0, 0).setScrollFactor(0, 0).setDepth(104).setPadding(20);
    let Timer = this.add.text(CTScore.getTopRight().x, 10 ,`${minute}:${seconds}` ,{ fontSize: 30, color: '#FFFF00', backgroundColor: 'rgba(0,0,0,0.5)', font: '2.5em' }).setOrigin(0, 0).setScrollFactor(0, 0).setDepth(104).setPadding(20);
    let TScore = this.add.text(Timer.getTopRight().x, 10 ,`${scoreBoard.TERRORIST}` ,{ fontSize: 30, color: '#FFFFFF', backgroundColor: 'rgb(255, 191, 0, 0.5)', font: '2.5em' }).setOrigin(0, 0).setScrollFactor(0, 0).setDepth(104).setPadding(20);
    let TLabel = this.add.text(TScore.getTopRight().x, 10 ,`TERRORIST` ,{ color: '#FFBF00', backgroundColor: 'rgba(0,0,0,0.5)', font: '2.5em' }).setOrigin(0, 0).setScrollFactor(0, 0).setDepth(104).setPadding(50, 20, 50, 20);
    roundTimerInterval = setInterval(() => {
        if(roundTimeLeft <= 0) {
            clearInterval(roundTimerInterval);
        }
        let minute = Math.floor(roundTimeLeft / 60);
        let seconds: any = roundTimeLeft % 60;
        if(seconds <= 9) {
            seconds = `0${seconds}`
        }
        Timer.text = `${minute}:${seconds}`
        roundTimeLeft--;
    }, 1000)
}

function gunUI(this: any) {
    let gun = this.matter.add.image(this.cameras.main.width - 200, this.cameras.main.height - 75, 'gun').setOrigin(0, 0).setScale(0.1, 0.1).setDepth(104).setScrollFactor(0, 0).setSensor(true);
    bulletInfoLabel = this.add.text(this.cameras.main.width - 150, this.cameras.main.height - 85 ,`${bulletLeft}/∞` ,{ color: '#FFFFFF', font: '3.5em' }).setOrigin(0, 0).setScrollFactor(0, 0).setDepth(104).setPadding(20);
}

const config = {
    type: Phaser.WEBGL,
    parent: 'game-container',
    backgroundColor: '#6c757d',
    physics: {
      default: 'matter',
      matter: {
            gravity: {
                y: 0,
                x: 0
            },
            debug: false
        }
    },
    width: window.innerWidth,
    height: window.innerHeight,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },    
    scene: [GameScene]
}

function add_player(uid: string, x: number, y: number, category: Category, angle: number, health: number) {
    let sprite = createPlayer(uid, category, x, y, angle, health);
    if(category == Category.ENEMY) {
        enemies[uid] = sprite;  
    } else {
        allies[uid] = sprite;
    }
    return sprite
}

function add_label(uid: string, x: number, y: number, category: Category) {
    let scene = game.scene.scenes[0];
    return scene.add.text(x, y - 60, uid, { fontSize: 20, color: category == Category.ENEMY ? '#ff0000' : '#00ff00' }).setOrigin(0.5, 0.5)
}

export function renderPlayer(uid: string, x: number, y: number, angle: number, team: string, health: number = 100) {
    let scene = game.scene.scenes[0];
    let player;
    if(team != playerTeam) {
        if (enemies[uid] != undefined) {
            player = enemies[uid];
        } else {
            player = add_player(uid, x, y, Category.ENEMY, angle, health);
        }
    } else {
        if(allies[uid] != undefined) {
            player = allies[uid];
        } else {
            player = add_player(uid, x, y, Category.ALLY, angle, health);
        }
    }

    if(!player.isAlive) {
        return;
    }

    if(player.x != x || player.y != y || player.rotation != angle) {
        let x_pos = [player.x, x];
        let y_pos = [player.y, y];
        let shortestAngle = Phaser.Math.Angle.ShortestBetween(Phaser.Math.RadToDeg(player.rotation), Phaser.Math.RadToDeg(angle));
        let shortestRotation = Phaser.Math.DegToRad(shortestAngle);
        let angle_arr = [player.rotation, player.rotation + shortestRotation]
        player.incr = 0;
        if(player.timer) {
            player.timer.destroy();
        }
        player.timer = scene.time.addEvent({
            delay: 10,
            loop: true,
            callback: interpolate,
            args: [player, x_pos, y_pos, angle_arr]
        })
    }
}

export function renderRoundWinner(winner: string) {
    let scene = game.scene.scenes[0];
    let winnerLabel = scene.add.text(scene.cameras.main.width / 2, scene.cameras.main.height / 2 ,`${winner} win` ,{ fontSize: 50, color: '#000000', backgroundColor: '#dddddd' }).setOrigin(0.5, 0.5).setScrollFactor(0, 0).setDepth(103).setPadding(20);
    setTimeout(() => {
        winnerLabel.destroy();
    }, 5000)
    clearInterval(roundTimerInterval);
}

export function renderMatchWinner(winner: string) {
    let scene = game.scene.scenes[0];
    scene.add.text(scene.cameras.main.width / 2, scene.cameras.main.height / 2 ,`${winner} wins the match` ,{ fontSize: 50, color: '#000000', backgroundColor: '#ffdc18' }).setOrigin(0.5, 0.5).setScrollFactor(0, 0).setDepth(103).setPadding(20);
    setTimeout(() => {
        ws.close();
        game.destroy(true);
        event.setMenu();
    }, 5000)
}

function interpolate(player: any, x_pos: any, y_pos: any, angle_arr: any) {
    let newX = Phaser.Math.Interpolation.Linear(x_pos, player.incr);
    let newY = Phaser.Math.Interpolation.Linear(y_pos, player.incr);
    let newA = Phaser.Math.Interpolation.Linear(angle_arr, player.incr);
    player.setPosition(newX, newY);
    player.setRotation(Phaser.Math.Angle.Wrap(newA));
    player.label.x = newX;
    player.label.y = newY - 60;
    player.incr += 0.1
    if(player.incr > 1) {
        player.timer.destroy();
        player.timer = null;
    }
}

function sendHit(enemyUid: string, shot_id: number) {
    ws.send(JSON.stringify({
        event_name: "HIT",
        uid: username,
        enemyUid: enemyUid,
        shot_id: shot_id
    }))
}

function sendShoot(pointer_x: number, pointer_y: number, angle: number, shot_id: number, uid: string) {
    ws.send(JSON.stringify({
        event_name: "SHOOT",
        id: shot_id,
        uid: uid,
        x: pointer_x,
        y: pointer_y,
        angle: angle
    }))
}

export function renderBullets(x: number, y: number, angle: number, uid: string, team: string) {
    shoot(x, y, angle, undefined, uid, team);
}

export function updateHealth(uid: string, team: string, health: number, isAlive: boolean) {
    let sprite: any;
    if(uid == username) {
        setBarValue(healthBar, health);
        sprite = player;
    } else {
        if(team == playerTeam) {
            allies[uid].health = health;
            sprite = allies[uid];
        } else {
            enemies[uid].health = health;
            sprite = enemies[uid];
        }
    }

    if(!isAlive) {
        killPlayer(sprite, uid, team);
    }
}

function killPlayer(sprite: any, uid: string, team: string) {
    let scene = game.scene.scenes[0];
    if(username == uid) {
        isAlive = false;
        clearInterval(interval);
    }

    sprite.isAlive = false;
    sprite.setScale(0.1, 0.1)
    sprite.setTexture('tomb');
    scene.matter.world.remove(sprite);
    sprite.setDepth(-1);
    sprite.setRotation(0);
}

let game: Phaser.Game;

function send_pose(player: any) {
    ws.send(JSON.stringify({
        event_name: "POSITION",
        uid: username,
        x: player.x,
        y: player.y,
        angle: isAlive ? player.rotation : 0
    }))
}

function createPlayer(uid: string, category: Category, x: number = 200, y: number = 200, angle: number = Math.PI, health: number) {
    let scene = game.scene.scenes[0];
    let localLabel;
    switch(category) {
        case Category.SELF:
            localLabel = Label.SELF
            break;
        case Category.ALLY:
            localLabel = Label.ALLY
            break;
        case Category.ENEMY:
            localLabel = Label.ENEMY
            break;
    }

    shapes.shooter2.fixtures[0].label = 'player';
    shapes.shooter2.fixtures[0].playerType = localLabel;
    shapes.shooter2.fixtures[0].uid = uid;
    let player: any = scene.matter.add.sprite(x, y, 'player', undefined, {
        shape: shapes.shooter2,
    });

    player.setRotation(angle)
    player.label = add_label(uid, x, y, category);
    player.health = health;
    player.isAlive = health > 0 ? true : false;
    
    player.body.immovable = true;
    player.body.moves = false;

    player.body.collideWorldBounds = true;
    player.setScale(0.4, 0.4);
    player.last_shot = 0;
    player.active = true;
    
    return player;
}

function shootPreprocess(player: any) {
    shot_id ++;

    let angle = player.rotation;
    var pointX = player.x + gun_distance * Math.cos(angle + gun_angle);
    var pointY = player.y + gun_distance * Math.sin(angle + gun_angle);
    let handleX = player.x + handle_distance * Math.cos(angle + handle_angle);
    let handleY = player.y + handle_distance * Math.sin(angle + handle_angle);
    let processedAngle = Phaser.Math.Angle.Between(handleX, handleY, pointX, pointY);
    
    shoot(pointX, pointY, processedAngle, shot_id, username, playerTeam);

    sendShoot(pointX, pointY, processedAngle, shot_id, username);
}

function shoot(pointX: number, pointY: number, processedAngle: number, shot_id: number | undefined = undefined, uid: string | undefined = undefined, team: string) {
    let scene: any= game.scene.scenes[0];
    let vx = Math.cos(processedAngle) * bulletVelocity;
    let vy = Math.sin(processedAngle) * bulletVelocity;
    let sprite: string;
    if(team == 'COUNTER_TERRORIST') {
        sprite = "projectile-ct"
    } else {
        sprite = "projectile-t"
    }
    let bullet = scene.matter.add.sprite(
        pointX,
        pointY,
        sprite,
        undefined,
        { friction: 0, frictionAir: 0, frictionStatic: 0, label: "bullet", isSensor: true, shape: { type: "circle", radius: 10 } }
    ).setOrigin(0.5, 0.5);
    map_shot_id ++;
    bullet.body.shot_id = shot_id;
    bullet.body.map_shot_id = map_shot_id;
    bullet.body.uid = uid;
    bullet.body.velocityX = vx;
    bullet.body.velocityY = vy;
    bullet.setRotation(processedAngle - Math.PI)
    bullet.setScale(0.3, 0.3);
    bulletMap[map_shot_id] = bullet;
}

function renderInitialPlayers() {
    for(let userId in initialPlayerData) {
        if(userId == username) {
            continue;
        }

        let user = initialPlayerData[userId];
        renderPlayer(userId, user.pos_x, user.pos_y, user.angle, user.team, user.health);
    }
}

window.onload = () => {
    username = prompt('Enter username!') ?? "null"
    ws = new WebSocket(`ws://localhost:7000?user=${username}`);

    ws.addEventListener("error", (event: any) => {
        alert(`Error: ${JSON.stringify(event)}`);
    });
    
    ws.onopen = () => {
        let playerData: any = {}
        playerData[username] = 100;
        startGame({pos_x: 200, pos_y: 200, angle: Math.PI}, 'TERRORIST', playerData, {COUNTER_TERRORIST: 2, TERRORIST: 3}, 20);
        // event = new Events(ws, username);
    }

    ws.onmessage = (message: any) => {
        try {
            let parsedEvent = JSON.parse(message.data.toString());
            // event.handleEvents(parsedEvent);
        } catch(e) {
            console.log(e);
        } 
    }
};

export function startGame(spawn: any, team: string, users: any, score: any, time_left: number) {
    playerSpawn = spawn;
    playerTeam = team;
    scoreBoard = score;
    initialPlayerData = users;
    roundTimeLeft = time_left;
    if(game) {
        enemies = {};
        allies = {};
        bulletMap = {};
        game.scene.scenes[0].scene.restart();
        bulletLeft = MAX_BULLETS;
        isStarted = false;
    } else {
        game = new Phaser.Game(config);
    }
}

export function isInit() {
    return isStarted;
}

enum Category {
    SELF = 0,
    ENEMY = 1,
    ALLY = 2
}

enum Label {
    SELF = 'SELF',
    ENEMY = 'ENEMY',
    ALLY = 'ALLY'
}
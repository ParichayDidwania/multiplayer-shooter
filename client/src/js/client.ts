import Phaser, { Game } from "phaser";
import { Events } from "./events";
import * as proto from '../protos/protoFile_pb';
import geckos, { ClientChannel } from '@geckos.io/client'

const playerSprite = 'assets/sprites/shooter2.png';
const bulletSprite = 'assets/sprites/bullet.png'

const MAX_BULLETS = 5;
const URL = 'ws://185.183.182.175:7000';
const UDP_URL = 'http://185.183.182.175'

//UNCOMMENT TO RUN LOCALLY
// const URL = 'ws://localhost:7000';  
// const UDP_URL = 'http://localhost'

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
let channel: any;
let username: string;
let isStarted = false;
let handle_angle = Math.PI/2;
let handle_distance = 16
let shapes: any;
let gun_angle = 0.34
let gun_distance = 48;
let bulletVelocity = 750;
let vision: any;
let event: Events;

let playerSpawn: any;
let playerTeam: string;

let initialPlayerData: any;
let timeout: any;
let scoreBoard: any;
let roundTimeLeft: number;
let roundTimerInterval: any;
let bulletReloadAnimInterval: any;
let bulletLeft = MAX_BULLETS;
let reloadTimeout: any;
let bulletInfoLabel: any;
let reloadBtn: any;
let bombDropBtn: any;
let bomb_coords: any = {};
let bomb: any;
let planted_bomb: any;
let bombBtnCooldown = 0;

let bombPlantBtn: any;
let isOnSiteA: any;
let isOnSiteB: any;

let tip: any;
let isPlanting = false;
let plantingBar: any;
let plantingProgress = 0;

const PLANTING_INCREMENT = 1;
let plantBarCooldown: any = 0;
let isBombPlanted = false;
let bombPlantTween: any;

let bombDiffuseButton: any;
let diffuseBarCooldown: any = 0;
let diffuseProgress = 0;
let diffusingBar: any;
let isDiffusing = false;

let explosion: any;
let explosionAlpha = 0;

let Timer: any;
let roomData: any;
let hitTween: any;

let currentSpectatePlayerName: any;
let spectatePlayerText: any;

let isDestroyed = false;
let playerScoreTexts: any = {
    'COUNTER_TERRORIST': [],
    'TERRORIST': []
}
let scoreBoardBtn: any;
let scoreBoardElements: any = [];
let inf = '\u{221E}';

let isRoundEnded = false;
const soundDist = 900;
const maxBombVol = 0.5
let bombTick: any = undefined;
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
        this.load.image('player-ct', 'assets/sprites/shooter-ct.png');
        this.load.image('player-t', 'assets/sprites/shooter-t.png');
        this.load.image('player-t-bomb', 'assets/sprites/shooter-t-bomb.png');
        this.load.image('player', playerSprite);
        this.load.image('projectile', bulletSprite);
        this.load.image('projectile-ct', 'assets/sprites/bullet-ct.png')
        this.load.image('projectile-t', 'assets/sprites/bullet-t.png')
        this.load.json('shapes', 'assets/sprites/playerShape.txt');
        this.load.image('tile', 'assets/sprites/wall.png')
        this.load.tilemapTiledJSON('map', 'assets/sprites/map2.txt');
        this.load.image('vision', 'assets/sprites/mask.png');
        this.load.tilemapTiledJSON('floormap', 'assets/sprites/floor.txt');
        this.load.image('floor', 'assets/sprites/floor.png');
        this.load.image('health', 'assets/sprites/health.png');
        this.load.image('tomb', 'assets/sprites/tomb.png')
        this.load.image('gun', 'assets/sprites/gun.png')
        this.load.image('bomb', 'assets/sprites/bomb.png')
        this.load.image('bomb-planted', 'assets/sprites/bomb-plant.png')
        this.load.image('siteA', 'assets/sprites/siteA.png')
        this.load.image('siteB', 'assets/sprites/siteB.png')
        this.load.image('arrow', 'assets/sprites/arrow.png')

        this.load.audio('shot', 'assets/sounds/shot.mp3');
        this.load.audio('footsteps', 'assets/sounds/footsteps.mp3');
        this.load.audio('bombTick', 'assets/sounds/bombTick.mp3');
        this.load.audio('explosion', 'assets/sounds/explosion.mp3');
        this.load.audio('defuse', 'assets/sounds/defuse.mp3');
        this.load.audio('reload', 'assets/sounds/reload.mp3');
    }
      
    create(): void {
        const map = this.make.tilemap({ key: 'map' });
        const floorMap = this.make.tilemap({ key: 'floormap' });

        const floorset: any = floorMap.addTilesetImage('floor', 'floor');
        const tileset: any = map.addTilesetImage('wall', 'tile');

        const floorlayer: any = floorMap.createLayer('floormap', floorset);
        floorlayer.setDepth(-3);
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

        explosion = this.make.renderTexture({
            x: map.widthInPixels/2,
            y: map.heightInPixels/2,
            width: map.widthInPixels,
            height: map.heightInPixels
        }, true)
        explosion.fill(0xFF7A00, 0);
        explosion.setDepth(200);

        shapes = this.cache.json.get('shapes');
        let bounds = this.matter.world.setBounds(map.widthInPixels, map.heightInPixels);
        Object.values(bounds.walls).forEach(o => o.label = 'bounds');

        player = createPlayer(username ?? "UNNAMED", Category.SELF, playerSpawn.pos_x, playerSpawn.pos_y, playerSpawn.angle, initialPlayerData[username].health, playerTeam, initialPlayerData[username].kills, initialPlayerData[username].deaths);
        isAlive = true;
        healthBar = makeBar.call(this, 5, this.cameras.main.height - 100, 0xc0c0c0);
        makeScoreUI.call(this)
        gunUI.call(this);
        renderBomb(isBombPlanted);
        renderSiteA.call(this);
        renderSiteB.call(this);

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
            } else if (bodyA.label == 'bullet' && bodyB.label == 'player') {
                if (bodyA.uid == username && bodyB.playerType == Label.ENEMY) {
                    sendHit(bodyB.uid, bodyA.shot_id);
                }

                if(bodyA.uid != bodyB.uid) {
                    delete bulletMap[bodyA.map_shot_id];
                    bodyA.gameObject.destroy();
                }
            }
        });

        this.cameras.main.startFollow(player);

        wasd = this.input.keyboard?.addKeys({ 'W': Phaser.Input.Keyboard.KeyCodes.W, 'S': Phaser.Input.Keyboard.KeyCodes.S, 'A': Phaser.Input.Keyboard.KeyCodes.A, 'D': Phaser.Input.Keyboard.KeyCodes.D });
        reloadBtn = this.input.keyboard?.addKeys({ 'R': Phaser.Input.Keyboard.KeyCodes.R });
        bombDropBtn = this.input.keyboard?.addKeys({ 'G': Phaser.Input.Keyboard.KeyCodes.G });
        scoreBoardBtn = this.input.keyboard?.addKeys({ 'TAB': Phaser.Input.Keyboard.KeyCodes.TAB })
        
        wasd.check_pressed_up = function () { return this.W.isDown };
        wasd.check_pressed_down = function () { return this.S.isDown };
        wasd.check_pressed_left = function () { return this.A.isDown };
        wasd.check_pressed_right = function () { return this.D.isDown };
        reloadBtn.isReloadPressed = function() { return this.R.isDown };
        bombDropBtn.isDropPressed = function() { return this.G.isDown };
        scoreBoardBtn.isDownPressed = function() { return this.TAB.isDown };
        
        if(playerTeam == 'TERRORIST') {
            bombPlantBtn = this.input.keyboard?.addKeys({ 'E': Phaser.Input.Keyboard.KeyCodes.E });
            bombPlantBtn.isPlantPressed = function() { return this.E.isDown };
        } else {
            bombDiffuseButton = this.input.keyboard?.addKeys({ 'E': Phaser.Input.Keyboard.KeyCodes.E });
            bombDiffuseButton.isDiffusePressed = function() { return this.E.isDown };
        }

        this.input.on('pointermove',  (pointer: any) => {
            if(isAlive && !isPlanting && !isDiffusing) {
                let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY);
                player.setRotation(angle);
            }
        }, this);

        this.input.on("pointerdown", (pointer: any) => {
            if(isAlive && !isPlanting && !isDiffusing) {
                if(bulletLeft > 0) {
                    if (player.last_shot > 250 && player.active) {
                        shootPreprocess(player);
                        player.last_shot = 0;
                        bulletLeft--;
                        bulletInfoLabel.text = `${bulletLeft}/${inf}`
                    }
                } else if (!reloadTimeout) {
                    reload();
                }
            }
        }, this);

        renderInitialPlayers();

        if(roomData) {
            if(roomData.bomb.isExploded) {
                explode();
            } else if(!roomData.bomb.isPlanted && roomData.bomb.isPicked.value) {
                let bomber = roomData.bomb.isPicked.by;
                bombPicked(bomber);
            }
        }

        setPosTimeout(player);

        makeLeaderBoard();
        isStarted = true;
    }

    update(time: number, delta: number): void {
        if(isAlive && !isPlanting && !isDiffusing) {
            var xMovement = 0;
            var yMovement = 0;
    
            xMovement = wasd.check_pressed_left() ? -1 : wasd.check_pressed_right() ? 1 : 0;
            yMovement = wasd.check_pressed_up() ? -1 : wasd.check_pressed_down() ? 1 : 0;
    
            if (xMovement != 0 && yMovement != 0) {
                player.x += (xMovement * diag_speed * delta);
                player.y += (yMovement * diag_speed * delta);
                
                let angle = Phaser.Math.Angle.Between(player.x, player.y, this.input.mousePointer.x + this.cameras.main.scrollX,  this.input.mousePointer.y + this.cameras.main.scrollY);
                player.setRotation(angle);
            } else if (xMovement != 0 || yMovement != 0) {
                player.x += (xMovement * speed * delta);
                player.y += (yMovement * speed * delta);
                let angle = Phaser.Math.Angle.Between(player.x, player.y,  this.input.mousePointer.x + this.cameras.main.scrollX,  this.input.mousePointer.y + this.cameras.main.scrollY);
                player.setRotation(angle);
            } else {
                if(player.footsteps.isPlaying) {
                    player.footsteps.stop();
                }
            }

            if(xMovement != 0 || yMovement != 0) {
                if(!player.footsteps.isPlaying && !isRoundEnded && !isPlanting && !isDiffusing) {
                    player.footsteps.setVolume(0.1);
                    player.footsteps.play();
                }
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

            bombBtnCooldown += delta;

            if(bombDropBtn.isDropPressed() && bombBtnCooldown > 250) {
                bombBtnCooldown = 0;
                if(player.hasBomb) {
                    sendBombDrop();
                } else if (playerTeam == 'TERRORIST' && bomb && bomb.body && this.matter.overlap(bomb, player) && !isBombPlanted) {
                    sendBombPicked();
                }
            }
        }

        if(isAlive) {
            plantBarCooldown += delta;
            diffuseBarCooldown += delta;

            if(playerTeam == 'TERRORIST' && bombPlantBtn.isPlantPressed() && player.hasBomb) { 
                if(isOnSiteA(player.x, player.y) || isOnSiteB(player.x, player.y)) {
                    if(plantBarCooldown >= 60) {
                        plantBarCooldown = 0;
                        startPlanting();
                    }
                } else {
                    renderTip('You can only plant on the site!');
                }
            }

            if(isPlanting && !bombPlantBtn.isPlantPressed()) {
                stopPlanting();
            }

            if(playerTeam == 'COUNTER_TERRORIST' && bombDiffuseButton.isDiffusePressed() && bomb && bomb.body && this.matter.overlap(bomb, player) && isBombPlanted) {
                if(diffuseBarCooldown >= 60) {
                    diffuseBarCooldown = 0;
                    startDiffusing();
                }
            }

            if(isDiffusing && !bombDiffuseButton.isDiffusePressed()) {
                stopDiffusing();
            }
        }

        if(isBombPlanted && bombTick && bomb) {
            let dist = getDistanceFromPlayer(bomb);
            let vol = dist > soundDist ? 0 : ((soundDist-dist)/soundDist) * maxBombVol;
            bombTick.setVolume(vol);
        }

        if(scoreBoardBtn && scoreBoardBtn.isDownPressed()) {
            makeScoreBoardVisible(true);
        } else {
            makeScoreBoardVisible(false);
        }

        for(let bulletId in bulletMap) {
            bulletMap[bulletId].x += bulletMap[bulletId].body.velocityX * (delta/1000);
            bulletMap[bulletId].y += bulletMap[bulletId].body.velocityY * (delta/1000);
        }        
    }
};

function playOtherPlayerFootSteps(otherPlayer: any) {
    if(!isRoundEnded) {
        let max_vol = 0.5;
        let dist = getDistanceFromPlayer(otherPlayer);
        let vol = dist > soundDist ? 0 : ((soundDist-dist)/soundDist) * max_vol;
        if(vol > 0) {
            otherPlayer.footsteps.setVolume(vol);
            if(!otherPlayer.footsteps.isPlaying) {
                otherPlayer.footsteps.play()
            }
        }
    }
}

function stopOtherPlayerFootSteps(otherPlayer: any) {
    if(otherPlayer.footsteps.isPlaying) {
        otherPlayer.footsteps.stop();
    }
}

function getDistanceFromPlayer(source_player: any) {
    let x,y;
    try {
        x = source_player.x;
        y = source_player.y;
    } catch (e) {
        return 0;
    }
    let dist = 0;
    if(!currentSpectatePlayerName) {
        dist = Math.sqrt(((x - player.x)*(x - player.x)) + ((y - player.y)*(y - player.y)));
    } else {
        let ally = allies[currentSpectatePlayerName];
        dist = Math.sqrt(((x - ally.x)*(x - ally.x)) + ((y - ally.y)*(y - ally.y)));
    }

    return dist;
}

function getSoundProximityConfig(uid: string) {
    let conf = {
        volume: 1
    };

    if(uid != username) {
        let source_player;
        if(enemies[uid]) {
            source_player = enemies[uid];
        } else if (allies[uid]) {
            source_player = allies[uid];
        }

        if(source_player) {
            let dist = getDistanceFromPlayer(source_player);
            conf.volume = dist > soundDist ? 0 : ((soundDist-dist)/soundDist);
        }
    }
    return conf;
}

function setPosTimeout(player: any) {
    timeout = setTimeout(() => {
        send_pose(player);
        setPosTimeout(player);
    }, 100)
}

function reload() {
    let scene = game.scene.scenes[0];
    let dotArray = ['.', '..', '...']
    let i = 0;
    scene.sound.play('reload', { rate: 0.67 });
    bulletReloadAnimInterval = setInterval(() => {
        let dot = '';
        if(i >= dotArray.length - 1) {
            i = 0;
        } else {
            i++;
        }
        dot = dotArray[i];
        bulletInfoLabel.text = `${dot}/${inf}`
    }, 250)
    reloadTimeout = setTimeout(() => {
        clearInterval(bulletReloadAnimInterval);
        bulletLeft = MAX_BULLETS;
        bulletInfoLabel.text = `${bulletLeft}/${inf}`
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

function makeLeaderBoard() {
    let scene = game.scene.scenes[0];
    let startCoords = { x: scene.cameras.main.width / 3, y: scene.cameras.main.height / 3 };
    let width = startCoords.x;

    let font = '2em bold Times New Roman'
    let ctBackground = 'rgb(0,0,0,0.5)';
    let textColor = '#0096ff';
    let textColor2 = '#FFBF00';
    let ctText: any = scene.add.text(startCoords.x, startCoords.y, `Counter Terrorist`, { color: textColor, backgroundColor: ctBackground, font: font }).setOrigin(0, 0).setDepth(200).setScrollFactor(0, 0).setFixedSize(width, 0).setPadding(5);
    makeLbColumns(ctText.getBottomLeft().x, ctText.getBottomLeft().y, width, ctBackground, font, textColor, 'COUNTER_TERRORIST');
    let tText: any = scene.add.text(startCoords.x, startCoords.y + (ctText.height * 7), `Terrorist`, { color: textColor2, backgroundColor: ctBackground, font: font }).setOrigin(0, 0).setDepth(200).setScrollFactor(0, 0).setFixedSize(width, 0).setPadding(5);
    makeLbColumns(tText.getBottomLeft().x, tText.getBottomLeft().y, width, ctBackground, font, textColor2, 'TERRORIST');
    scoreBoardElements.push(...[ctText, tText])
}

function makeLbColumns(x: number, y: number, width: number, background: string, font: string, textColor: string, team: string) {
    let scene = game.scene.scenes[0];
    let nameWidth = width * 0.7;
    let restWidth = width * 0.15;
    let nameHeading: any = scene.add.text(x, y , `Name`, { color: textColor, backgroundColor: background, font: font }).setOrigin(0, 0).setDepth(200).setScrollFactor(0, 0).setFixedSize(nameWidth, 0).setPadding(5);
    let killsHeading: any = scene.add.text(nameHeading.getTopRight().x, nameHeading.getTopRight().y, `Kills`, { color: textColor, backgroundColor: background, font: font }).setOrigin(0, 0).setDepth(200).setScrollFactor(0, 0).setFixedSize(restWidth, 0).setPadding(5);
    let DeathsHeading: any = scene.add.text(killsHeading.getTopRight().x, killsHeading.getTopRight().y, `Deaths`, { color: textColor, backgroundColor: background, font: font }).setOrigin(0, 0).setDepth(200).setScrollFactor(0, 0).setFixedSize(restWidth, 0).setPadding(5);
    let fontColor = { alive: '#FFFFFF', dead: '#FF0000' }
    scoreBoardElements.push(...[nameHeading, killsHeading, DeathsHeading])
    addPlayersToLb(team, nameHeading.getBottomLeft().x, DeathsHeading.getBottomLeft().y, width, DeathsHeading.height, background, '2em Times New Roman', fontColor);
}

function addPlayersToLb(team: string, x: number, y: number, width: number, height: number, background: string, font: string, textColor: any) {
    let scene = game.scene.scenes[0];

    let users;
    if(team == playerTeam) {
        let selfObj: any = {};
        selfObj[username] = player;
        users = { ...allies, ...selfObj};
    } else {
        users = enemies;
    }

    let nameWidth = width * 0.7;
    let restWidth = width * 0.15;

    let userIds = Object.keys(users);

    for(let i = 0; i < 5; i++) {
        if(userIds[i]) {
            let user = users[userIds[i]];
            let color = user.isAlive ? textColor.alive : textColor.dead;
            let name: any = scene.add.text(x, y + (height * i), `${userIds[i]}`, { color: color, backgroundColor: background, font: font }).setOrigin(0, 0).setDepth(200).setScrollFactor(0, 0).setFixedSize(nameWidth, 0).setPadding(5);
            let kills: any = scene.add.text(name.getTopRight().x, y + (height * i), `${user.kills}`, { color: color, backgroundColor: background, font: font }).setOrigin(0, 0).setDepth(200).setScrollFactor(0, 0).setFixedSize(restWidth, 0).setPadding(5);
            let deaths: any = scene.add.text(kills.getTopRight().x, y + (height * i), `${user.deaths}`, { color: color, backgroundColor: background, font: font }).setOrigin(0, 0).setDepth(200).setScrollFactor(0, 0).setFixedSize(restWidth, 0).setPadding(5);
            playerScoreTexts[team].push({ name: name, kills: kills, deaths: deaths });
            scoreBoardElements.push(...[name, kills, deaths])
        } else {
            let empty: any = scene.add.text(x, y + (height * i), ` `, { backgroundColor: background, font: font }).setOrigin(0, 0).setDepth(200).setScrollFactor(0, 0).setFixedSize(width, 0).setPadding(5);
            playerScoreTexts[team].push({ empty: empty });
            scoreBoardElements.push(...[empty])
        }
    }
}

function resetScoreBoard() {
    let parsedEnemies = [];
    let parsedAllies = [];
    for(let enemy in enemies) {
        parsedEnemies.push({
            name: enemy,
            kills: enemies[enemy].kills,
            deaths: enemies[enemy].deaths,
            kd: enemies[enemy].kills/enemies[enemy].deaths,
            isAlive: enemies[enemy].isAlive
        })
    }

    for(let ally in allies) {
        parsedAllies.push({
            name: ally,
            kills: allies[ally].kills,
            deaths: allies[ally].deaths,
            kd: allies[ally].kills/allies[ally].deaths,
            isAlive: allies[ally].isAlive
        })
    }

    parsedAllies.push({
        name: username,
        kills: player.kills,
        deaths: player.deaths,
        kd: player.kills/player.deaths,
        isAlive: isAlive
    })

    parsedEnemies.sort((a: any, b: any) => {
        return b.kd - a.kd;
    })
    parsedAllies.sort((a: any, b: any) => {
        return b.kd - a.kd;
    })

    for(let team in playerScoreTexts) {
        let users: any;
        if(team == playerTeam) {
            users = parsedAllies;
        } else {
            users = parsedEnemies;
        }

        for(let i = 0; i < users.length; i++) {
            let textObj = playerScoreTexts[team][i];
            textObj.name.setText(users[i].name);
            textObj.kills.setText(users[i].kills);
            textObj.deaths.setText(users[i].deaths);

            if(!users[i].isAlive) {
                textObj.name.setColor('#FF0000');
                textObj.kills.setColor('#FF0000');
                textObj.deaths.setColor('#FF0000');
            }
        }
    }
}

function makeScoreBoardVisible(val: boolean) {
    for(let elem of scoreBoardElements) {
        elem.setVisible(val);
    }
}

function renderBomb(isPlanted = false) {
    let scene = game.scene.scenes[0];
    bomb = scene.matter.add.image(bomb_coords.x, bomb_coords.y, 'bomb', undefined, { label: 'bomb' }).setOrigin(0.5, 0.5).setSensor(true).setDepth(-1);
    if(isPlanted) {
        bombTick = scene.sound.add('bombTick', { loop: true, delay: 1 });
        planted_bomb = scene.add.image(bomb.x, bomb.y, 'bomb-planted').setOrigin(0.5, 0.5).setDepth(-1);
        bombPlantTween = scene.tweens.add({
            targets: [planted_bomb],
            duration: 500,
            alpha: 0,
            ease: 'Cubic',
            repeat: -1
        })
        let dist = getDistanceFromPlayer(bomb);
        let vol = dist > soundDist ? 0 : ((soundDist-dist)/soundDist) * maxBombVol;
        bombTick.setVolume(vol);
        bombTick.play();
    }
}


function setBarValue(bar: Phaser.GameObjects.Graphics, percentage: number) {
    bar.scaleX = percentage / 100;
}

function renderSiteA(this: Phaser.Scene) {
    let pointX = 254;
    let pointY = 1405;
    let width = 511;
    let height = 450;
    let rect3 = this.add.graphics({
        lineStyle: {
            width: 3,
            color: 0xff0000,
            alpha: 1
        }
    });
    rect3.strokeRect(pointX, pointY, width, height).setDepth(-3);
    this.add.image(pointX + width / 2, pointY + height / 2, 'siteA').setDepth(-3).setOrigin(0.5, 0.5).setScale(0.1, 0.1);
    isOnSiteA = function(x: number, y: number) {
        return (x >= pointX && x <= (pointX + width) && y >= pointY && y <= (pointY + height));
    }
}

function renderSiteB(this: Phaser.Scene) {
    let pointX = 1283;
    let pointY = 315;
    let width = 320;
    let height = 388;
    let rect3 = this.add.graphics({
        lineStyle: {
            width: 3,
            color: 0xff0000,
            alpha: 1
        }
    });
    rect3.strokeRect(pointX, pointY, width, height).setDepth(-3);
    this.add.image(pointX + width / 2, pointY + height / 2, 'siteB').setDepth(-3).setOrigin(0.5, 0.5).setScale(0.2, 0.2);
    isOnSiteB = function(x: number, y: number) {
        return (x >= pointX && x <= (pointX + width) && y >= pointY && y <= (pointY + height));
    }
}

function renderTip(text: string) {
    let scene = game.scene.scenes[0];
    if(tip == undefined) {
        tip = scene.add.text(scene.cameras.main.width - 10, 10 ,`${text}` , { color: '#F6BE00', font: '2em Arial' }).setOrigin(1, 0).setScrollFactor(0, 0).setDepth(104).setPadding(20);
        setTimeout(() => {
            tip.destroy();
            tip = undefined;
        }, 3000)
    }
}

function startPlanting() {
    let scene = game.scene.scenes[0];
    if(player.footsteps.isPlaying) {
        player.footsteps.stop();
    }
    if(plantingBar) {
        plantingProgress += PLANTING_INCREMENT;
        plantingBar.fillRect(player.x - 25, player.y + 50, plantingProgress, 10);
        if(plantingProgress >= 50) {
            stopPlanting();
            player.hasBomb = false;
            sendBombPlanted();
        }
    } else {
        plantingProgress = 0;
        isPlanting = true;
        plantingBar = scene.add.graphics({
            lineStyle: {
                width: 2,
                color: 0xFFA500,
                alpha: 1
            },
            
            fillStyle: {
                color: 0xFFA500
            }
        });
        plantingBar.strokeRect(player.x - 25, player.y + 50, 50, 10)
        plantingBar.setDepth(101)
    }   
}

function stopPlanting(){
    if(plantingBar) {
        plantingBar.destroy();
        plantingBar = undefined;
    }

    isPlanting = false
}

function startDiffusing() {
    if(player.footsteps.isPlaying) {
        player.footsteps.stop();
    }
    let scene = game.scene.scenes[0];
    if(diffusingBar) {
        diffuseProgress += PLANTING_INCREMENT;
        diffusingBar.fillRect(player.x - 25, player.y + 50, diffuseProgress, 10);
        if(diffuseProgress >= 50) {
            stopDiffusing();
            sendBombDiffused();
        }
    } else {
        diffuseProgress = 0;
        isDiffusing = true;
        diffusingBar = scene.add.graphics({
            lineStyle: {
                width: 2,
                color: 0xFFA500,
                alpha: 1
            },
            
            fillStyle: {
                color: 0xFFA500
            }
        });
        diffusingBar.strokeRect(player.x - 25, player.y + 50, 50, 10);
        diffusingBar.setDepth(101);

        scene.sound.play('defuse');
        sendStartBombDiffusing()
    }   
}

function stopDiffusing() {
    if(diffusingBar) {
        diffusingBar.destroy();
        diffusingBar = undefined;
    }

    isDiffusing = false
}

function makeSpectateUI() {
    let scene = game.scene.scenes[0];
    let y = scene.cameras.main.height * 0.8;
    let x = scene.cameras.main.width / 2;

    let sidePad = scene.cameras.main.width / 4;

    spectatePlayerText = scene.add.text(x, y ,`${username}`, { color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.5)', font: '2.5em' }).setOrigin(0.5, 0.5).setScrollFactor(0, 0).setDepth(104).setPadding(sidePad, 20, sidePad, 20 );
    let tr: any = spectatePlayerText.getTopRight();
    let tl: any = spectatePlayerText.getTopLeft();
    let rightArrow = scene.add.image(tr.x , y, 'arrow').setOrigin(0.4, 0.5).setScrollFactor(0, 0).setDepth(104).setScale(0.15, 0.15).setName('rightArrow').setInteractive();
    let leftArrow = scene.add.image(tl.x , y, 'arrow').setOrigin(0.4, 0.5).setScrollFactor(0, 0).setDepth(104).setScale(0.15, 0.15).setRotation(-1 * Math.PI).setName('leftArrow').setInteractive();

    scene.input.on('gameobjectdown', (objA: any, objB: any) => {
        let aliveAllies: string[] = [];
        for(let ally in allies) {
            if(allies[ally].isAlive) {
                aliveAllies.push(ally);
            }
        }

        if(aliveAllies.length > 0) {
            if(currentSpectatePlayerName) {
                let index = aliveAllies.indexOf(currentSpectatePlayerName);
                if(index != -1) {
                    if(objB.name == 'rightArrow') {
                        currentSpectatePlayerName = index + 1 > aliveAllies.length - 1 ? aliveAllies[0] : aliveAllies[index + 1];
                    } else if (objB.name == 'leftArrow') {
                        currentSpectatePlayerName = index - 1 < 0 ? aliveAllies[aliveAllies.length - 1] : aliveAllies[index - 1];
                    }
                } else {
                    currentSpectatePlayerName = aliveAllies[0];
                }
            } else {
                currentSpectatePlayerName = aliveAllies[0];
            }
            
            if(objB.name == 'rightArrow' || objB.name == 'leftArrow') {
                spectatePlayer();
            }
        }
    })
}

function autoChangeSpectateOnKill() {
    let aliveAllies: string[] = [];
    if(aliveAllies.length > 0) {
        for(let ally in allies) {
            if(allies[ally].isAlive) {
                aliveAllies.push(ally);
            }
        }
    
        if(currentSpectatePlayerName) {
            let index = aliveAllies.indexOf(currentSpectatePlayerName);
            if(index != -1) {
                currentSpectatePlayerName = index + 1 > aliveAllies.length - 1 ? aliveAllies[0] : aliveAllies[index + 1];
            } else {
                currentSpectatePlayerName = aliveAllies[0];
            }
        } else {
            currentSpectatePlayerName = aliveAllies[0];
        }
        
        spectatePlayer();
    }
}

function spectatePlayer() {
    let scene = game.scene.scenes[0];
    spectatePlayerText.setText(currentSpectatePlayerName);
    if(!isAlive && vision) {
        vision.x = allies[currentSpectatePlayerName].x;
        vision.y = allies[currentSpectatePlayerName].y;
    }
    scene.cameras.main.startFollow(allies[currentSpectatePlayerName]);
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
    Timer = this.add.text(CTScore.getTopRight().x, 10 ,`${minute}:${seconds}` ,{ fontSize: 30, color: '#FFFF00', backgroundColor: 'rgba(0,0,0,0.5)', font: '2.5em' }).setOrigin(0, 0).setScrollFactor(0, 0).setDepth(104).setPadding(20);
    let TScore = this.add.text(Timer.getTopRight().x, 10 ,`${scoreBoard.TERRORIST}` ,{ fontSize: 30, color: '#FFFFFF', backgroundColor: 'rgb(255, 191, 0, 0.5)', font: '2.5em' }).setOrigin(0, 0).setScrollFactor(0, 0).setDepth(104).setPadding(20);
    let TLabel = this.add.text(TScore.getTopRight().x, 10 ,`TERRORIST` ,{ color: '#FFBF00', backgroundColor: 'rgba(0,0,0,0.5)', font: '2.5em' }).setOrigin(0, 0).setScrollFactor(0, 0).setDepth(104).setPadding(50, 20, 50, 20);
    clearInterval(roundTimerInterval);
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

    if(isBombPlanted) {
        startTimerBackgroundFlash();
    }
}

function startBombTimer() {
    let minute = Math.floor(roundTimeLeft / 60);
    let seconds: any = roundTimeLeft % 60;
    if(seconds <= 9) {
        seconds = `0${seconds}`
    }
    Timer.setText(`${minute}:${seconds}`);
}

function onHitAnim(sprite: any) {    
    if(hitTween && hitTween.isPlaying()) {
        hitTween.remove();
        hitTween.destroy();
        sprite.setAlpha(1);
    }

    hitTween = game.scene.scenes[0].tweens.add({
        targets: [sprite],
        duration: 75,
        alpha: 0.5,
        ease: 'Cubic',
        repeat: 1,
        yoyo: true
    })
}

function startTimerBackgroundFlash() {
    let scene = game.scene.scenes[0];
    Timer.setBackgroundColor('rgba(255,0,0,0.0)');
    let alphaIncr = 0.05;
    let bombTimerAlpha = 0;
    scene.time.addEvent({
        delay: 20,
        loop: true,
        callback: () => { 
            bombTimerAlpha += alphaIncr;
            Timer.setBackgroundColor(`rgba(255,0,0, ${bombTimerAlpha})`);
            if(bombTimerAlpha >= 0.5) {
                alphaIncr = -0.01;
            } else if (bombTimerAlpha <= 0) {
                alphaIncr = 0.01;
            }
        },
    })
}

function gunUI(this: any) {
    let gun = this.matter.add.image(this.cameras.main.width - 200, this.cameras.main.height - 75, 'gun').setOrigin(0, 0).setScale(0.1, 0.1).setDepth(104).setScrollFactor(0, 0).setSensor(true);
    bulletInfoLabel = this.add.text(this.cameras.main.width - 150, this.cameras.main.height - 85 ,`${bulletLeft}/${inf}` ,{ color: '#FFFFFF', font: '3.5em' }).setOrigin(0, 0).setScrollFactor(0, 0).setDepth(104).setPadding(20);
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

function add_player(uid: string, x: number, y: number, category: Category, angle: number, health: number, team: string, kills: number, deaths: number) {
    let sprite = createPlayer(uid, category, x, y, angle, health, team, kills, deaths);
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

export function playBombDiffuseSound() {
    let scene = game.scene.scenes[0];
    let dist = getDistanceFromPlayer(bomb);
    let vol = dist > soundDist ? 0 : ((soundDist-dist)/soundDist);
    scene.sound.play('defuse', { volume: vol });
}

export function bombDiffused() {
    if(bombTick?.isPlaying) {
        bombTick.stop();
    }
    bomb.body.gameObject.destroy();
    bomb = undefined;
    planted_bomb.destroy();
}

export function explode() {
    if(bombTick?.isPlaying) {
        bombTick.stop();
    }
    let dist = getDistanceFromPlayer(bomb);
    bomb ? bomb.body.gameObject.destroy(): undefined;
    planted_bomb ? planted_bomb.destroy() : undefined;
    let scene = game.scene.scenes[0];
    let explodeEvent = scene.time.addEvent({
        delay: 50,
        loop: true,
        callback: () => { 
            explosionAlpha += 0.01;
            explosion.fill(0xFF7A00, explosionAlpha); 
            if(explosionAlpha >= 0.1) {
                explodeEvent.destroy();
            }
        },
    })
    scene.cameras.main.shake(500);
    let vol = dist > soundDist ? 0 : ((soundDist-dist)/soundDist);
    scene.sound.play('explosion', { volume: vol });
}

export function renderPlayer(uid: string, x: number, y: number, angle: number, team: string, health: number = 100, kills = 0, deaths = 0) {
    let scene = game.scene.scenes[0];
    let player;
    if(team != playerTeam) {
        if (enemies[uid] != undefined) {
            player = enemies[uid];
        } else {
            player = add_player(uid, x, y, Category.ENEMY, angle, health, team, kills, deaths);
        }
    } else {
        if(allies[uid] != undefined) {
            player = allies[uid];
        } else {
            player = add_player(uid, x, y, Category.ALLY, angle, health, team, kills, deaths);
        }
    }

    if(!player.isAlive) {
        return;
    }

    let posChanged = true;
    if(!player.isAlive || (Math.abs(player.x - x) <= 0.1 && Math.abs(player.y - y) <= 0.1)) {
        stopOtherPlayerFootSteps(player);
        posChanged = false;
    }

    if(player.isAlive && (Math.abs(player.x - x) > 0.1 || Math.abs(player.y - y) > 0.1 || Math.abs(player.rotation - angle) > 0.1)) {
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
            args: [uid, player, x_pos, y_pos, angle_arr, posChanged]
        })
    }
}

export function renderRoundWinner(winner: string, isExploded: boolean) {
    let scene = game.scene.scenes[0];
    let winnerLabel = scene.add.text(scene.cameras.main.width / 2, scene.cameras.main.height / 3 ,`${winner} win` ,{ fontSize: 50, color: '#000000', backgroundColor: '#dddddd' }).setOrigin(0.5, 0.5).setScrollFactor(0, 0).setDepth(103).setPadding(20);
    if(isExploded) {
        explode();
    }
    setTimeout(() => {
        isRoundEnded = true;
        clearInterval(bulletReloadAnimInterval);
        clearTimeout(timeout);
        winnerLabel.destroy();
    }, 5000)
    clearInterval(roundTimerInterval);
}

function stopAllFootSteps() {
    if(player.footsteps.isPlaying) {
        player.footsteps.stop();
    }
    for(let ally in allies) {
        if(allies[ally].footsteps.isPlaying) {
            allies[ally].footsteps.stop();
        }
    }
    for(let enemy in enemies) {
        if(enemies[enemy].footsteps.isPlaying) {
            enemies[enemy].footsteps.stop();
        }
    }
}

export function renderMatchWinner(winner: string) {
    let scene = game.scene.scenes[0];
    scene.add.text(scene.cameras.main.width / 2, scene.cameras.main.height / 3 ,`${winner} wins the match` ,{ fontSize: 50, color: '#000000', backgroundColor: '#ffdc18' }).setOrigin(0.5, 0.5).setScrollFactor(0, 0).setDepth(103).setPadding(20);
    setTimeout(() => {
        game.destroy(true);
        event.setMenu();
        isDestroyed = true;
        ws.close();
        channel.close();
        event.resetConn();
    }, 5000)
}

function interpolate(uid: string, player: any, x_pos: any, y_pos: any, angle_arr: any, posChanged: boolean) {
    let newX = Phaser.Math.Interpolation.Linear(x_pos, player.incr);
    let newY = Phaser.Math.Interpolation.Linear(y_pos, player.incr);
    let newA = Phaser.Math.Interpolation.Linear(angle_arr, player.incr);
    player.setPosition(newX, newY);
    if(posChanged) {
        playOtherPlayerFootSteps(player);
    }
    player.setRotation(Phaser.Math.Angle.Wrap(newA));
    player.label.x = newX;
    player.label.y = newY - 60;
    if(!isAlive && vision && currentSpectatePlayerName && currentSpectatePlayerName == uid) {
        vision.x = newX;
        vision.y = newY;
    }
    player.incr += 0.1
    if(player.incr > 1) {
        stopOtherPlayerFootSteps(player);
        if(!player.isAlive) {
            player.setRotation(0);
        }
        player.timer.destroy();
        player.timer = null;
    }
}

function sendStartBombDiffusing() {
    channel.emit('START_BOMB_DIFFUSE', {
        eventName: 'START_BOMB_DIFFUSE',
        uid: username
    })
}

function sendBombPlanted() {
    ws.send(JSON.stringify({
        eventName: "BOMB_PLANTED",
    }))
}

function sendBombDiffused() {
    ws.send(JSON.stringify({
        eventName: "BOMB_DIFFUSED",
    }))
}

function sendBombPicked() {
    channel.emit('BOMB_PICKED', {
        eventName: "BOMB_PICKED",
        uid: username
    })
}

function sendBombDrop() {
    channel.emit('BOMB_DROPPED', {
        eventName: "BOMB_DROPPED",
        uid: username
    })
}

function sendHit(enemyUid: string, shot_id: number) {
    ws.send(JSON.stringify({
        eventName: "HIT",
        uid: username,
        enemyUid: enemyUid,
        shot_id: shot_id
    }))
}

function sendShoot(pointer_x: number, pointer_y: number, angle: number, shot_id: number, uid: string) {
    let shot = {
        eventName: "SHOOT",
        id: shot_id,
        uid: uid,
        x: pointer_x,
        y: pointer_y,
        angle: angle
    }
    channel.emit('SHOOT', shot);
}

export function bombPlanted(uid: string, x: number, y: number, time_left: number) {
    bomb_coords.x = x;
    bomb_coords.y = y;

    if(uid == username) {
        player.setTexture('player-t');
        player.hasBomb = false;
    } else {
        if(playerTeam == 'TERRORIST') {
            allies[uid].setTexture('player-t');
            allies[uid].hasBomb = false;
        } else {
            enemies[uid].setTexture('player-t');
            enemies[uid].hasBomb = false;
        }
    }

    isBombPlanted = true;
    renderBomb(true);

    roundTimeLeft = time_left - 1;
    startBombTimer();

    startTimerBackgroundFlash();
}

export function bombPicked(uid: string) {
    bomb.body.gameObject.destroy();
    if(uid == username) {
        player.setTexture('player-t-bomb');
        player.hasBomb = true;
    } else {
        if(playerTeam == 'TERRORIST') {
            allies[uid].setTexture('player-t-bomb');
            allies[uid].hasBomb = true;
        } else {
            enemies[uid].setTexture('player-t-bomb');
            enemies[uid].hasBomb = true;
        }
    }
}

export function bombDropped(uid: string, x: number, y: number) {
    bomb_coords.x = x;
    bomb_coords.y = y;
    if(uid == username) {
        player.setTexture('player-t');
        player.hasBomb = false;
    } else {
        if(playerTeam == 'TERRORIST') {
            allies[uid].setTexture('player-t');
            allies[uid].hasBomb = false;
        } else {
            enemies[uid].setTexture('player-t');
            enemies[uid].hasBomb = false;
        }
    }
    renderBomb();
}

export function renderBullets(x: number, y: number, angle: number, uid: string, team: string) {
    shoot(x, y, angle, undefined, uid, team);
}

export function updateHealth(uid: string, team: string, health: number, isAlive: boolean, shooter: any = undefined) {
    let sprite: any;
    if(uid == username) {
        setBarValue(healthBar, health);
        sprite = player;
    } else {
        if(team == playerTeam) {
            allies[uid].health = health;
            sprite = allies[uid];
            if(!isAlive && shooter) {
                enemies[shooter.uid].kills = shooter.kills;
                enemies[shooter.uid].deaths = shooter.deaths;
            }
        } else {
            enemies[uid].health = health;
            sprite = enemies[uid];
            if(!isAlive && shooter) {
                if(shooter.uid == username) {
                    player.kills = shooter.kills;
                    player.deaths = shooter.deaths;
                } else {
                    allies[shooter.uid].kills = shooter.kills;
                    allies[shooter.uid].deaths = shooter.deaths;
                }
            }
        }
    }

    if(!isAlive) {
        sprite.deaths ++;
        killPlayer(sprite, uid);
        resetScoreBoard()
    } else {
        onHitAnim(sprite);
    }
}

function killPlayer(sprite: any, uid: string) {
    let scene = game.scene.scenes[0];
    if(username == uid) {
        isAlive = false;
        clearTimeout(timeout);
        makeSpectateUI();
        autoChangeSpectateOnKill();
    } else if(uid == currentSpectatePlayerName) {
        autoChangeSpectateOnKill();
    }

    sprite.isAlive = false;
    sprite.setScale(0.1, 0.1)
    sprite.setTexture('tomb');
    sprite.setRotation(0);
    sprite.setDepth(-2);
    scene.matter.world.remove(sprite);
}

let game: Phaser.Game;

function send_pose(player: any) {
    let posObj = {
        eventName: 'POSITION',
        uid: username,
        x: player.x.toFixed(2),
        y: player.y.toFixed(2),
        angle: isAlive ? player.rotation.toFixed(2) : 0,
        team: playerTeam
    }

    channel.emit('POSITION', posObj);
}

function createPlayer(uid: string, category: Category, x: number = 200, y: number = 200, angle: number = Math.PI, health: number, team: string, kills: number, deaths: number) {
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

    let sprite: any;
    if(team == 'COUNTER_TERRORIST') {
        sprite = 'player-ct';
    } else {
        sprite = 'player-t';
    }

    shapes.shooter2.fixtures[0].label = 'player';
    shapes.shooter2.fixtures[0].playerType = localLabel;
    shapes.shooter2.fixtures[0].uid = uid;
    shapes.shooter2.fixtures[0].team = team;
    let player: any = scene.matter.add.sprite(x, y, sprite, undefined, {
        shape: shapes.shooter2,
    });

    player.setRotation(angle)
    player.label = add_label(uid, x, y, category);
    player.health = health;
    player.isAlive = true;
    
    player.body.immovable = true;
    player.body.moves = false;

    player.body.collideWorldBounds = true;
    player.setScale(0.4, 0.4);
    player.last_shot = 0;
    player.active = true;
    player.hasBomb = false;

    player.kills = kills;
    player.deaths = deaths;

    player.footsteps = scene.sound.add('footsteps', { loop: true });

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

    uid ? scene.sound.play('shot', getSoundProximityConfig(uid)) : undefined
}

function renderInitialPlayers() {
    for(let userId in initialPlayerData) {
        if(userId == username) {
            continue;
        }

        let user = initialPlayerData[userId];
        renderPlayer(userId, user.pos_x, user.pos_y, user.angle, user.team, user.health, user.kills, user.deaths);
    }

    let combined = { ...allies, ...enemies };

    for(let uid in combined) {
        let user = initialPlayerData[uid];
        updateHealth(uid, user.team, user.health, user.isAlive);
    }
}

function setWsListeners(ws: any) {
    ws.addEventListener("error", (event: any) => {
        alert(`Error: ${JSON.stringify(event)}`);
    });
    ws.binaryType = 'arraybuffer'

    // ws.onopen = () => {
    //     // let playerData: any = {}
    //     // playerData[username] = {
    //     //     team: "COUNTER_TERRORIST",
    //     //     pos_x: 1700,
    //     //     pos_y: 1700,
    //     //     angle: 0,
    //     //     health: 100,
    //     //     isAlive: true,
    //     //     kills: 3,
    //     //     deaths: 1
    //     // };
    //     // playerData['abcd'] = {
    //     //     team: "COUNTER_TERRORIST",
    //     //     pos_x: 1600,
    //     //     pos_y: 1600,
    //     //     angle: 0,
    //     //     health: 100,
    //     //     isAlive: true,
    //     //     kills: 1,
    //     //     deaths: 2
    //     // }
    //     // startGame({pos_x: 1700, pos_y: 1800, angle: Math.PI}, 'COUNTER_TERRORIST', playerData, {COUNTER_TERRORIST: 2, TERRORIST: 3}, 20, {x: 1700, y:1700});
    // }

    ws.onmessage = (message: any) => {
        try {
            let parsedEvent: any;
            if(typeof message.data == 'object') {
                let buffer = new Uint8Array(message.data);
                parsedEvent = (proto as any).Position.deserializeBinary(buffer).toObject();
            } else {
                parsedEvent = JSON.parse(message.data.toString());
            }
            event.handleEvents(parsedEvent);
        } catch(e) {
            console.log(e);
        } 
    }
}

window.onload = () => {
    username = '';
    event = new Events(username);
};

export function openWSConnection(uid: string) {
    username = uid;
    ws = new WebSocket(`${URL}?user=${username}`);
    setWsListeners(ws);
    return ws;
}

export function openUdpConnection() {
    channel = geckos({ port: 7001, url: UDP_URL });
    return channel;
}

function resetVariables(alreadyExists = false) {
    shot_id = 0;
    map_shot_id = 0;
    speed = 0.3;
    bulletMap = {};
    healthBar = undefined;
    isAlive = false;
    diag_speed = speed / 1.414
    wasd = undefined;
    isStarted = false;
    handle_angle = Math.PI/2;
    handle_distance = 16
    shapes = undefined ;
    gun_angle = 0.34
    gun_distance = 48;
    bulletVelocity = 750;
    vision = undefined;
    playerSpawn = undefined;
    playerTeam = '';
    initialPlayerData = undefined ;
    timeout = undefined;
    scoreBoard = undefined;
    roundTimeLeft = -1;
    roundTimerInterval = undefined;
    bulletReloadAnimInterval = undefined;
    bulletLeft = MAX_BULLETS;
    reloadTimeout = undefined;
    bulletInfoLabel = undefined;
    reloadBtn = undefined;
    bombDropBtn = undefined;
    bomb_coords = {};
    bomb = undefined;
    planted_bomb = undefined;
    bombBtnCooldown = 0;
    bombPlantBtn = undefined;
    isOnSiteA = undefined;
    isOnSiteB = undefined;
    tip = undefined;
    isPlanting = false;
    plantingBar = undefined;
    plantingProgress = 0;
    plantBarCooldown  = 0;
    isBombPlanted = false;
    bombPlantTween = undefined;
    bombDiffuseButton = undefined;
    diffuseBarCooldown  = 0;
    diffuseProgress = 0;
    diffusingBar = undefined;
    isDiffusing = false;
    explosion = undefined;
    explosionAlpha = 0;
    Timer = undefined;
    roomData = undefined;
    hitTween = undefined;
    currentSpectatePlayerName = undefined;
    spectatePlayerText = undefined;
    playerScoreTexts = {
        'COUNTER_TERRORIST': [],
        'TERRORIST': []
    }
    scoreBoardBtn = undefined;
    scoreBoardElements = [];

    if(alreadyExists) {
        stopAllFootSteps();
        bombTick?.isPlaying ? bombTick.stop() : undefined;
    }
    player = undefined;
    enemies = {};
    allies = {};
    isRoundEnded = false;
    bombTick = undefined;
}

function ClearAllIntervals() {
    for (var i = 1; i < 99999; i++)
        window.clearInterval(i);
}

export function startGame(spawn: any, team: string, users: any, score: any, time_left: number, bomb: any) {
    ClearAllIntervals();
    resetVariables(game && !isDestroyed);
    
    playerSpawn = spawn;
    playerTeam = team;
    scoreBoard = score;
    initialPlayerData = users;
    roundTimeLeft = time_left - 2;
    bomb_coords = {
        x: bomb.x,
        y: bomb.y
    }

    if(game && !isDestroyed) {
        game.scene.scenes[0].scene.restart();
    } else {
        game = new Phaser.Game(config);
        isDestroyed = false;
    }
}

export function reconnectGame(room: any, spawn: any, team: string, users: any, score: any, bomb: any, round_timer: number, bomb_timer: number) {
    resetVariables();
    playerSpawn = spawn;
    playerTeam = team;
    scoreBoard = score;
    initialPlayerData = users;
    bomb_coords = {
        x: bomb.x,
        y: bomb.y
    }
    if(room.bomb.isPlanted) {
        isBombPlanted = true;
        roundTimeLeft = Math.floor(((room.current_round_bomb_plant_timestamp + bomb_timer * 1000) - (new Date().getTime())) / 1000);
        roundTimeLeft -= 1;
    } else {
        roundTimeLeft = Math.floor(((room.current_round_start_timestamp + round_timer * 1000) - (new Date().getTime())) / 1000);
        roundTimeLeft -= 2;
    }

    roomData = room;
    game = new Phaser.Game(config);
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
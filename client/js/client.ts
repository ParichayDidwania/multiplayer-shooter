import Phaser, { Game } from "phaser";

const playerSprite = 'assets/sprites/shooter2.png';
const bulletSprite = 'assets/sprites/bullet.png'

let speed = 0.2;
let diag_speed = speed / 1.414
let player : any;
let wasd : any;
let enemies : any = {};
let labels: any = {};
let ws: any;
let username: string | null;
let isStarted = false;
let projectiles: any;
let handle_angle = Math.PI/2;
let handle_distance = 16
let shapes: any;
let gun_angle = 0.34
let gun_distance = 48;
let bulletVelocity = 5;
let vision: any;
class GameScene extends Phaser.Scene {
    bullet: any;
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
        this.load.json('shapes', 'assets/sprites/playerShape.json');
        this.load.image('tile', 'assets/sprites/wall.png')
        this.load.tilemapTiledJSON('map', 'assets/sprites/map2.json');
        this.load.image('vision', 'assets/sprites/mask.png');
        this.load.tilemapTiledJSON('floormap', 'assets/sprites/floor.json');
        this.load.image('floor', 'assets/sprites/floor.png');
    }
      
    create(): void {
        const map = this.make.tilemap({ key: 'map' });
        const floorMap = this.make.tilemap({ key: 'floormap' });

        const floorset: any = floorMap.addTilesetImage('floor', 'floor');
        const tileset: any = map.addTilesetImage('wall', 'tile');

        const floorlayer: any = floorMap.createLayer('floormap', floorset);
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

        player = createPlayer(username ?? "UNNAMED", Category.SELF);

        vision = this.add.image(player.x, player.y, 'vision').setOrigin(0.5, 0.5);
        vision.scale = 1;
        vision.setDepth(100);
        vision.setVisible(false)

        rt.mask = new Phaser.Display.Masks.BitmapMask(this, vision);
        rt.mask.invertAlpha = true

        
        this.matter.world.on('collisionstart', function (event: any, bodyA: any, bodyB: any) {
            if(bodyA.label == 'bounds' && bodyB.label == 'bullet') {
                bodyB.gameObject.destroy();
            }

            if((bodyA.label == Label.ENEMY || bodyA.label == Label.ALLY) && bodyB.label == 'bullet') {
                bodyB.gameObject.destroy();
            }
        });

        this.cameras.main.startFollow(player);

        wasd = this.input.keyboard?.addKeys({ 'W': Phaser.Input.Keyboard.KeyCodes.W, 'S': Phaser.Input.Keyboard.KeyCodes.S, 'A': Phaser.Input.Keyboard.KeyCodes.A, 'D': Phaser.Input.Keyboard.KeyCodes.D });

        wasd.check_pressed_up = function () { return this.W.isDown };
        wasd.check_pressed_down = function () { return this.S.isDown };
        wasd.check_pressed_left = function () { return this.A.isDown };
        wasd.check_pressed_right = function () { return this.D.isDown };

        this.input.on('pointermove',  (pointer: any) => {
            let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY);
            player.setRotation(angle);
        }, this);

        this.input.on("pointerdown", (pointer: any) => {
            if (player.last_shot > 250 && player.active) {
                shootPreprocess(player);                
                player.last_shot = 0;
            }
        }, this);

        setInterval(() => {
            send_pose(player);
        }, 100)

        isStarted = true;
    }

    update(time: number, delta: number): void {
        var activity_detected = false;
        var xMovement = 0;
        var yMovement = 0;

        xMovement = wasd.check_pressed_left() ? 1 : wasd.check_pressed_right() ? -1 : 0;
        yMovement = wasd.check_pressed_up() ? 1 : wasd.check_pressed_down() ? -1 : 0;

        if (xMovement != 0 && yMovement != 0) {
            player.setVelocityX(xMovement * diag_speed * delta);
            player.setVelocityY(yMovement * diag_speed * delta);
            
            let angle = Phaser.Math.Angle.Between(player.x, player.y, this.input.mousePointer.x + this.cameras.main.scrollX,  this.input.mousePointer.y + this.cameras.main.scrollY);
            player.setRotation(angle);
        } else {
            player.setVelocityX(xMovement * speed * delta);
            player.setVelocityY(yMovement * speed * delta);
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
        
        // activity_detected = (2 * xMovement) + yMovement != 0 ? true : false;
    }
};

function onPlayerHit(object: any, projectile: any) {
    projectile.disableBody(true, true);
}

const config = {
    type: Phaser.WEBGL,
    parent: 'game-container',
    backgroundColor: '#6c757d',
    physics: {
      default: 'matter',
      matter: {
            gravity: {
                y: 0
            },
            debug: false
        }
    },
    width: 1000,
    height: 1000,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    scene: [GameScene]
}

function add_enemy(uid: string, x: number, y: number) {
    let sprite = createPlayer(uid, Category.ENEMY, x, y);
    enemies[uid] = sprite;  
    return sprite
}

function add_label(uid: string, x: number, y: number, category: Category) {
    let scene = game.scene.scenes[0];
    return scene.add.text(x, y - 60, uid, { fontSize: 20, color: category == Category.ENEMY ? '#ff0000' : '#00ff00' }).setOrigin(0.5, 0.5)
}

function renderEnemy(uid: string, x: number, y: number, angle: number) {
    let scene = game.scene.scenes[0];
    let enemy;
    if (enemies[uid] != undefined) {
        enemy = enemies[uid];
    } else {
        enemy = add_enemy(uid, x, y);
    }

    if(enemy.x != x || enemy.y != y || enemy.rotation != angle) {
        let x_pos = [enemy.x, x];
        let y_pos = [enemy.y, y];
        let shortestAngle = Phaser.Math.Angle.ShortestBetween(Phaser.Math.RadToDeg(enemy.rotation), Phaser.Math.RadToDeg(angle));
        let shortestRotation = Phaser.Math.DegToRad(shortestAngle);
        let angle_arr = [enemy.rotation, enemy.rotation + shortestRotation]
        enemy.incr = 0;
        if(enemy.timer) {
            enemy.timer.destroy();
        }
        enemy.timer = scene.time.addEvent({
            delay: 10,
            loop: true,
            callback: interpolate,
            args: [enemy, x_pos, y_pos, angle_arr]
        })
    }
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

function sendShoot(pointer_x: number, pointer_y: number, angle: number) {
    ws.send(JSON.stringify({
        event_name: "SHOOT",
        uid: username,
        pointer_x: pointer_x,
        pointer_y: pointer_y,
        angle: angle
    }))
}

function renderBullets(uid: string, pointer_x: number, pointer_y: number, angle: number) {
    if (enemies[uid] != undefined) {
        shoot(pointer_x, pointer_y, angle);
    }
}

let game: Phaser.Game;

function send_pose(player: any) {
    ws.send(JSON.stringify({
        event_name: "POSITION",
        uid: username,
        x: player.x,
        y: player.y,
        angle: player.rotation
    }))
}

function createPlayer(uid: string, category: Category, x: number = 200, y: number = 200) {
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

    shapes.shooter2.fixtures[0].label = localLabel;
    let player: any = scene.matter.add.sprite(x, y, 'player', undefined, {
        shape: shapes.shooter2,
    });

    player.label = add_label(uid, x, y, category);
    
    player.body.immovable = true;
    player.body.moves = false;

    player.body.collideWorldBounds = true;
    player.setScale(0.4, 0.4);
    player.last_shot = 0;
    player.active = true;
    
    return player;
}

function shootPreprocess(player: any) {
    let angle = player.rotation;
    var pointX = player.x + gun_distance * Math.cos(angle + gun_angle);
    var pointY = player.y + gun_distance * Math.sin(angle + gun_angle);
    let handleX = player.x + handle_distance * Math.cos(angle + handle_angle);
    let handleY = player.y + handle_distance * Math.sin(angle + handle_angle);
    let processedAngle = Phaser.Math.Angle.Between(handleX, handleY, pointX, pointY);
    
    shoot(pointX, pointY, processedAngle);

    sendShoot(pointX, pointY, processedAngle);
}

function shoot(pointX: number, pointY: number, processedAngle: number, ) {
    let scene: any = game.scene.scenes[0];
    let vx = Math.cos(processedAngle) * bulletVelocity;
    let vy = Math.sin(processedAngle) * bulletVelocity
    scene.bullet = scene.matter.add.image(
        pointX,
        pointY,
        "projectile",
        undefined,
        { friction: 0, frictionAir: 0.001, label: "bullet" }
    ).setOrigin(0.5, 0.5);
    scene.bullet.setRotation(processedAngle - Math.PI)
    scene.bullet.setScale(1.2, 1.2)
    scene.bullet.setVelocityX(vx);
    scene.bullet.setVelocityY(vy);
}

window.onload = () => {
    username = prompt('Enter username!')
    ws = new WebSocket(`ws://localhost:7000?user=${username}`);
    ws.onopen = () => {
        game = new Phaser.Game(config);
    }

    ws.onmessage = (message: any) => {
        try {
            if(isStarted) {
                let parsedEvent = JSON.parse(message.data.toString());
                switch(parsedEvent.event_name) {
                    case 'POSITION':
                        renderEnemy(parsedEvent.uid, parsedEvent.x, parsedEvent.y, parsedEvent.angle);
                        break;

                    case 'SHOOT':
                        renderBullets(parsedEvent.uid, parsedEvent.pointer_x, parsedEvent.pointer_y, parsedEvent.angle);
                        break;
                }
            }
        } catch(e) {
            console.log(e);
        } 
    }
};

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
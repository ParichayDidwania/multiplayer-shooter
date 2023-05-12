import Phaser from "phaser";
const playerSprite = 'assets/sprites/shooter.png';
const bulletSprite = 'assets/sprites/bullet.png'

let speed = 20;
let diag_speed = speed / 1.414
let player : any;
let wasd : any;
let enemies : any = {};
let ws: any;
let username: string | null;
let isStarted = false;
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
    }
      
    create(): void {
        this.physics.world.setBounds(0, 0, 1000, 1000);
        let bound_rect = this.add.rectangle(501,501,999,999);  // draw rectangle around bounds
        bound_rect.setStrokeStyle(1, 0x343a40);
        player = this.physics.add.sprite(200, 200, 'player');
        player.body.collideWorldBounds = true;
        player.setScale(0.5, 0.5);
        player.setOrigin(0.5, 0.7476635514018692);
        player.last_shot = 0;
        player.active = true;
        // this.cameras.main.startFollow(player);

        let projectiles = this.physics.add.group({
            classType: Projectile,
            runChildUpdate: true,
            collideWorldBounds: false,
        });

        this.physics.add.collider(projectiles, player, onPlayerHit);

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
                    let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY);
                    var projectile = projectiles.get();
                    if (projectile) {
                    projectile.setScale(2, 2);
                    projectile.shoot(player, angle - Math.PI);
                    player.last_shot = 0;
                }
        
                // send_click(pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY, angle);
                player.anims.play('shoot', true);
            }
        }, this);

        this.events.on('postupdate', function () {
            send_pose(player);
        })
        isStarted = true;
    }

    update(time: number, delta: number): void {
        var activity_detected = false;
        var xMovement = 0;
        var yMovement = 0;

        xMovement = wasd.check_pressed_left() ? -1 : wasd.check_pressed_right() ? 1 : 0;
        yMovement = wasd.check_pressed_up() ? -1 : wasd.check_pressed_down() ? 1 : 0;

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
        // activity_detected = (2 * xMovement) + yMovement != 0 ? true : false;
    }
};

function onPlayerHit(object: any, projectile: any) {
    projectile.disableBody(true, true);
}

const config = {
    type: Phaser.CANVAS,
    parent: 'div_game',
    backgroundColor: '#6c757d',
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
        gravity: { y: 0 }
      }
    },
    width: 1000,
    height: 1000,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    scene: [GameScene]
}

class Projectile extends Phaser.Physics.Arcade.Sprite {
    lifespan = 0;
    constructor(scene: Phaser.Scene) {
		super(scene, 0, 0, 'projectile');
        this.setDepth(-1);
	}

    shoot(_player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, angle: number) {
        this.enableBody( // Enable physics body
            true, // Reset body and game object, at (x, y)
            _player.x,
            _player.y,
            true, // Activate sprite
            true  // Show sprite
        );
    
        this.setRotation(angle);
        const vx = Math.cos(this.rotation - Math.PI) * 40
        const vy = Math.sin(this.rotation - Math.PI) * 40
    
        this.setPosition(_player.x + vx, _player.y + vy);
    
        game.scene.scenes[0].physics.velocityFromRotation(this.rotation - Math.PI, 1000, this.body?.velocity)
        this.lifespan = 2000;
    }

    update(time: number, delta: number) {
        this.lifespan -= delta;
        if (this.lifespan <= 0) {
                this.disableBody( // Stop and disable physics body
                true, // Deactivate sprite (active=false)
                true  // Hide sprite (visible=false)
            );
        }
    }
}

function add_enemy(uid: string) {
    let sprite = game.scene.scenes[0].physics.add.sprite(0, 0, 'player');
    sprite.setScale(0.5, 0.5);
    sprite.name = uid;
    enemies[uid] = sprite;
  
    game.scene.scenes[0].physics.add.collider(sprite, player);
    return sprite
}

function renderEnemy(uid: string, x: number, y: number, angle: number) {
    if (enemies[uid] != undefined) {
        let enemy = enemies[uid];
        enemy.setPosition(x, y);
        enemies[uid].setRotation(angle);
    } else {
        let enemy = add_enemy(uid);
        enemy.setPosition(x, y);
        enemy.setRotation(angle);
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
                }
            }
        } catch(e) {
            console.log(e);
        } 
    }
};


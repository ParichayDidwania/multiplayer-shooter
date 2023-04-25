import Phaser from "phaser";
const playerSprite = 'assets/sprites/shooter.png';

let speed = 20;
let diag_speed = speed / 1.414
let player : Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
let wasd : any;
let gun_offset_x = 50.5;
let gun_offset_y = 27

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
        this.load.image('player', playerSprite)
    }
      
    create(): void {
        player = this.physics.add.sprite(200, 200, 'player');
        player.setScale(0.5, 0.5);
        // this.cameras.main.startFollow(player);

        wasd = this.input.keyboard?.addKeys({ 'W': Phaser.Input.Keyboard.KeyCodes.W, 'S': Phaser.Input.Keyboard.KeyCodes.S, 'A': Phaser.Input.Keyboard.KeyCodes.A, 'D': Phaser.Input.Keyboard.KeyCodes.D });

        wasd.check_pressed_up = function () { return this.W.isDown };
        wasd.check_pressed_down = function () { return this.S.isDown };
        wasd.check_pressed_left = function () { return this.A.isDown };
        wasd.check_pressed_right = function () { return this.D.isDown };

        this.input.on('pointermove',  (pointer: any) => {
            let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x + this.cameras.main.scrollX, pointer.y + this.cameras.main.scrollY);
            let processedAngle = angle < 0 ? -1 * angle : 2 * Math.PI - angle;
            console.log(processedAngle);
            player.setRotation(angle);
        }, this);
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
        } else {
            player.setVelocityX(xMovement * speed * delta);
            player.setVelocityY(yMovement * speed * delta);
        }
        // activity_detected = (2 * xMovement) + yMovement != 0 ? true : false;
    }
};

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
    width: window.innerWidth,
    height: window.innerHeight,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    scene: [GameScene]
}

window.onload = () => {
    const game = new Phaser.Game(config);
};


import Phaser from 'phaser';
import GameScene from './../scenes/GameScene';
import GameConfig from "../GameConfig";
import Trigger from './Trigger';
import TemperatureSystem from './../core/TemperatureSystem';

export default class Character extends Phaser.GameObjects.Sprite {
    /**
     * @param {GameScene} scene
     * @param {number} x
     * @param {number} y
     * @param {string} characterId
     */
    constructor (scene, x, y, characterId) {
        let key = Character.getCharacterKey(characterId);
        super(scene, x, y, 'all', key);

        /**
         * @type {GameScene}
         */
        this.scene = this.scene;

        this.scene.physics.world.enable(this);
        this.scene.add.existing(this);

        this.setOrigin(0.5, 1);

        this.setDepth(GameConfig.DepthLayers.Player);

        this.acceleration = 250;
        this.body.maxVelocity.x = 50;
        this.body.maxVelocity.y = 0;

        this.body.setDragX(250);

        /**
         * @type {number}
         * @private
         */
        this._level = 1;

        /**
         * @type {string}
         */
        this.characterId = characterId;

        /**
         * @type {TemperatureSystem}
         */
        this.temperatureSystem = this.scene.temperatureSystem;

        /**
         * @type {string}
         * @private
         */
        this._directionFacing = 'right';

        /**
         * @type {boolean}
         * @private
         */
        this._isControllerByPlayer = true;

        /**
         * @type {Furniture|Boiler|GameItem}
         * @private
         */
        this._currentNearestItem = null;

        /**
         * @type {Furniture|Boiler|GameItem}
         * @private
         */
        this._pickedItem = null;

        /**
         * @type {boolean}
         * @private
         */
        this._interactLock = false;

        /**
         * @type {boolean}
         * @private
         */
        this._lockControlls = false;

        /**
         * @type {number}
         * @private
         */
        this._health = GameConfig.Characters.MaxHealth;

        /**
         * @type {boolean}
         * @private
         */
        this._inside = true;

        this._overHeadText = this.scene.add.text(this.x, this.y, 'Matrix has you', { fontFamily: 'Verdana, Arial', fontSize: 25, color: '#FFFFFF' }); // '#FF0000'
        this._overHeadText.setOrigin(0.5, 5);
        this._overHeadText.setDepth(GameConfig.DepthLayers.Text);
        this._overHeadText.setScale(0.25, 0.25);

        this.scene.events.on('interact', () => {
            if (this._pickedItem && (!this._currentNearestItem || this._currentNearestItem.constructor.name !== 'Trigger')) {
                this._putDown();
                return;
            }
            if (!this._currentNearestItem) return;
            if (this._interactLock) return;
            this._handleInteract();
        });

        this.scene.time.addEvent({
            delay: 1500,
            loop: true,
            callbackScope: this,
            callback: this._handleHealth
        });
    }

    preUpdate () {
        if (this._isControllerByPlayer) {
            this._overHeadText.setVisible(true);
            let nearestPickableItem = this.scene.gameEnvironment.findNearestInteractiveItem();
            if (nearestPickableItem) {
                if (nearestPickableItem._totalPieces && !nearestPickableItem.canTakePiece()) {
                    this._overHeadText.setText(nearestPickableItem.emptyActionName);
                } else {
                    this._overHeadText.setText(nearestPickableItem.actionName + ' ' + nearestPickableItem.name);
                }
            } else {
                this._overHeadText.setText('');
            }

            this._currentNearestItem = nearestPickableItem;
        } else {
            this._overHeadText.setVisible(false);
        }

        if (this._pickedItem) {
            this._pickedItem.setPosition(this.x, this.y - 10);
        }
        this._overHeadText.setPosition(this.x, this.y);
    }

    /**
     * @param {number} velocity
     * @param {string} direction
     */
    walk (velocity, direction) {
        this.body.setAccelerationX(velocity);
        if (direction !== undefined) {
            if (this._directionFacing !== direction) {
                this._directionFacing = direction;
                this._redrawFacing();
            }
        }
    }

    _handleHealth () {
        if (this._inside) {
            if (this.temperatureSystem.getTemperature() <= GameConfig.Temperature.LowestPointForTakeHealth) {
                this._health += (this.temperatureSystem.getTemperature() - 13) / 10;
            } else {
                this._health += this.temperatureSystem.getTemperature() / 10;
            }
        } else {
            this._health -= 5; // if day + check hazmat
        }
        if (this._health > GameConfig.Characters.MaxHealth) {
            this._health = GameConfig.Characters.MaxHealth;
        }
    }

    _redrawFacing () {
        if (this._directionFacing === 'left') {
            this.setScale(-1, 1);
            this.body.setOffset(8, 0);
        } else if (this._directionFacing === 'right') {
            this.setScale(1, 1);
            this.body.setOffset(0, 0);
        }
    }

    _handleInteract () {
        if (this._currentNearestItem.constructor.name === 'Boiler') {
            this._currentNearestItem.toggleFire();
        }
        if (this._currentNearestItem.constructor.name === 'FurnitureWithPieaces') {
            if (this._currentNearestItem.canTakePiece()) {
                this._takePiece(this._currentNearestItem);
            } else if (this._currentNearestItem.isPickable) {
                this._pickUp(this._currentNearestItem);
            }
        }

        if (this._currentNearestItem.constructor.name === 'Furniture' && this._currentNearestItem.isPickable) {
            this._pickUp(this._currentNearestItem);
        }

        if (this._currentNearestItem.constructor.name === 'Trigger') {
            this._handleTrigger();
        }
    }

    _handleTrigger () {
        /** @type {Trigger} trigger */
        let trigger = this._currentNearestItem;
        if (trigger.getTriggerName() === 'goToSecondFloor') {
            this._interactLock = true;
            this._lockControlls = true;
            this.scene.tweens.add({
                targets: this,
                y: GameConfig.World.secondLevelY,
                duration: 1000,
                ease: 'Linear',
                onComplete: () => {
                    this._interactLock = false;
                    this._lockControlls = false;
                }
            });
        }
        if (trigger.getTriggerName() === 'goToFirstFloor') {
            this._interactLock = true;
            this._lockControlls = true;
            this.scene.tweens.add({
                targets: this,
                y: GameConfig.World.firstLevelY,
                duration: 1000,
                ease: 'Linear',
                onComplete: () => {
                    this._interactLock = false;
                    this._lockControlls = false;
                }
            });
        }
        if (trigger.getTriggerName() === 'goToSurface') {
            this._interactLock = true;
            this._lockControlls = true;
            this.scene.tweens.add({
                targets: this,
                y: GameConfig.World.surface,
                duration: 1000,
                ease: 'Linear',
                onComplete: () => {
                    this._interactLock = false;
                    this._lockControlls = false;
                    this._inside = false;
                }
            });
        }
        if (trigger.getTriggerName() === 'returnToShelter') {
            this._interactLock = true;
            this._lockControlls = true;
            this._inside = true;
            this.scene.tweens.add({
                targets: this,
                y: GameConfig.World.firstLevelY,
                duration: 1000,
                ease: 'Linear',
                onComplete: () => {
                    this._interactLock = false;
                    this._lockControlls = false;
                    this._inside = true;
                }
            });
        }
    }

    _pickUp (gameItem) {
        console.log('Try pickup ' + gameItem.name);
        console.log(gameItem);
        if (gameItem.canPickUp() && !this._pickedItem) {
            this._pickedItem = gameItem;
            this._pickedItem.pickUp();
        }
    }

    _takePiece (gameItem) {
        console.log('Try take piece ' + gameItem.name);
        if (gameItem.canTakePiece() && !this._pickedItem) {
            if (gameItem.generatePieceName && gameItem.takePiece()) {
                console.log('Piece taken');
                this._pickedItem = this.scene.gameEnvironment.generatePieceOf(this.x, this.y, gameItem.generatePieceName);
                this._pickedItem.pickUp();
            }
        }
    }

    _putDown () {
        this._pickedItem.putDown(this.x, this.y);
        this._pickedItem = null;
    }

    /**
     * @param {string} characterId
     * @return {string}
     */
    static getCharacterKey (characterId) {
        return 'characters/' + characterId + '_right_stay';
    }
}
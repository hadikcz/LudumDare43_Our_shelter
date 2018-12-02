import GameScene from '../scenes/GameScene.js';
import Boiler from './../entities/Boiler';
import GameConfig from '../GameConfig';
import Furniture from './../entities/Furniture';
import Items from '../Items';
import Trigger from "../entities/Trigger";
export default class GameEnvironment {
    /**
     * @param {GameScene} scene
     */
    constructor (scene) {
        /**
         * @type {GameScene}
         */
        this.scene = scene;

        /**
         * @type {Phaser.GameObjects.Group}
         * @private
         */
        this._walls = this.scene.add.group();

        this.scene.add.image(1, 1, 'surface').setOrigin(0, 0);
        this.nightSurface = this.scene.add.sprite(1, 1, 'nightSurface').setOrigin(0, 0);
        this.scene.add.image(1, 78, 'spaceBetweenSurfaceAndBasement').setOrigin(0, 0).setDepth(GameConfig.DepthLayers.UpOnLights);

        /**
         * @type {Boiler}
         * @private
         */
        this._boiler = new Boiler(this.scene, 286, GameConfig.World.firstLevelY - 1);

        /**
         * @type {Phaser.GameObjects.Group}
         */
        this.furnitures = this.scene.add.group();

        /**
         * @type {Phaser.GameObjects.Group}
         */
        this.triggers = this.scene.add.group();

        this._createColliders();
        this._createFurniture();
        this._createTriggers();
    }

    update () {
        this.scene.physics.collide(this._walls, this.scene.character);
    }

    /**
     * @return {Furniture|Boiler|GameItem|null}
     */
    findNearestInteractiveItem (target = this.scene.character) {
        if (Phaser.Math.Distance.Between(this._boiler.x, this._boiler.y, target.x, target.y) < GameConfig.MinimalInteractiveDistance) {
            return this._boiler;
        }

        let nearestFurniture = this.findNearestFurniture();
        if (nearestFurniture) {
            return nearestFurniture;
        }

        return this.findNearestTrigger();
    }

    findNearestFuel (target) {
        let nearestFurniture = this.findNearestFurniture(target, true);
        if (nearestFurniture) return nearestFurniture;

        return this.findNearestPickableItem(target);
    }

    findNearestFurniture (target = this.scene.character, onlyBurnable = false) {
        let nearest = null;
        let nearestDistance = Infinity;
        this.furnitures.getChildren().forEach((furniture) => {
            let distance = Phaser.Math.Distance.Between(furniture.x, furniture.y, target.x, target.y);
            if (distance < GameConfig.MinimalInteractiveDistance && distance < nearestDistance) {
                if (onlyBurnable && !furniture.canBurnUp()) {
                    return;
                }
                nearest = furniture;
                nearestDistance = distance;
            }
        });
        return nearest;
    }

    findNearestTrigger () {
        let target = this.scene.character;
        let nearest = null;
        let nearestDistance = Infinity;
        this.triggers.getChildren().forEach((trigger) => {
            let distance = Phaser.Math.Distance.Between(trigger.x, trigger.y, target.x, target.y);
            if (distance < GameConfig.MinimalInteractiveDistance && distance < nearestDistance) {
                nearest = trigger;
                nearestDistance = distance;
            }
        });
        return nearest;
    }

    findNearestPickableItem (target = this.scene.character) {
        // method for looking to items array when I create books, coal and so on.
        return null;
    }

    /**
     * @private
     */
    _createColliders () {
        let rect = this.scene.add.rectangle(0, 110, 16, 250, 0xFF0000, 0);
        this.scene.physics.world.enable(rect);
        rect.body.setImmovable(true);
        rect.body.setSize(16, 250);
        this._walls.add(rect);

        rect = this.scene.add.rectangle(321, 110, 16, 250, 0xFF0000, 0);
        this.scene.physics.world.enable(rect);
        rect.body.setImmovable(true);
        rect.body.setSize(16, 250);
        this._walls.add(rect);

        rect = this.scene.add.rectangle(30, 201, 16, 50, 0xFF0000, 0);
        this.scene.physics.world.enable(rect);
        rect.body.setImmovable(true);
        rect.body.setSize(16, 50);
        this._walls.add(rect);
    }

    _createTriggers () {
        this.triggers.add(new Trigger(this.scene, 27, GameConfig.World.firstLevelY - 1, 'goToSurface', Items.getItemBySpriteKey('goToSurface')));
        this.triggers.add(new Trigger(this.scene, 214, GameConfig.World.firstLevelY - 1, 'goToSecondFloor', Items.getItemBySpriteKey('goToSecondFloor')));
        this.triggers.add(new Trigger(this.scene, 214, GameConfig.World.secondLevelY - 1, 'goToFirstFloor', Items.getItemBySpriteKey('goToFirstFloor')));
        this.triggers.add(new Trigger(this.scene, 141, GameConfig.World.surface - 1, 'fixAirFilter', Items.getItemBySpriteKey('fixAirFilter')));
        this.triggers.add(new Trigger(this.scene, 27, GameConfig.World.surface - 1, 'returnToShelter', Items.getItemBySpriteKey('returnToShelter')));
    }

    _createFurniture () {
        // this.furniture = this.scene.add.image(0, 0, 'all', 'furniture/table');

        this.furnitures.add(new Furniture(this.scene, 65, GameConfig.World.firstLevelY - 1, 'furniture/hazmat_wardrobe', Items.getItemBySpriteKey('furniture/hazmat_wardrobe')));
        this.furnitures.add(new Furniture(this.scene, 90, GameConfig.World.firstLevelY - 1, 'furniture/library', Items.getItemBySpriteKey('furniture/library')));
        this.furnitures.add(new Furniture(this.scene, 135, GameConfig.World.firstLevelY - 1, 'furniture/table', Items.getItemBySpriteKey('furniture/table')));
        this.furnitures.add(new Furniture(this.scene, 113, GameConfig.World.firstLevelY - 1, 'furniture/small_table', Items.getItemBySpriteKey('furniture/small_table')));
    }
}

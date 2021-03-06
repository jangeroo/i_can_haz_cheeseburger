// This sectin contains some game constants. It is not super interesting
var GAME_WIDTH = 375;
var GAME_HEIGHT = 900;
var COLUMN_WIDTH = 75;
var FOOTER_HEIGHT = 40 + 10;

var FONT_SIZE = 30;

var ENEMY_WIDTH = 75;
var ENEMY_HEIGHT = 156;
var MAX_ENEMIES = 5;

var PLAYER_WIDTH = 75;
var PLAYER_HEIGHT = 54;
var PLAYER_STARTING_HEIGHT = GAME_HEIGHT - FOOTER_HEIGHT - 10 - PLAYER_HEIGHT;
var PLAYER_MAX_HEIGHT = PLAYER_HEIGHT * 2;

var AMMO_WIDTH = 75
var AMMO_HEIGHT = 40
var MAX_AMMO = 1

var MISSILE_WIDTH = 75;
var MISSILE_HEIGHT = 54;

// These two constants keep us from using "magic numbers" in our code
var LEFT_ARROW_CODE = 37;
var RIGHT_ARROW_CODE = 39;
var UP_ARROW_CODE = 38;
var DOWN_ARROW_CODE = 40;
var SPACE_BAR_CODE = 32;

// These two constants allow us to DRY
var MOVE_LEFT = 'left';
var MOVE_RIGHT = 'right';
var MOVE_UP = 'up';
var MOVE_DOWN = 'down';

// Preload game images
var images = {};
[
    'stars.png',
    'enemy.png', 'player.png', 'skull.png',
    'ammo.png', 'ammo_stash.png', 'missile.png',
].forEach(imgName => {
    var img = document.createElement('img');
    img.src = 'images/' + imgName;
    images[imgName] = img;
});





// This section is where you will be doing most of your coding
class Entity {
    render(ctx) {
        ctx.drawImage(this.sprite, this.x, this.y);
    }
}

class FallingThing extends Entity {
    update(timeDiff) {
        this.y = this.y + timeDiff * this.speed;
    }
}

class Enemy extends FallingThing {
    constructor(xPos) {
        super();
        this.x = xPos;
        this.y = -ENEMY_HEIGHT;
        this.sprite = images['enemy.png'];

        // Each enemy should have a different speed
        this.speed = Math.random() / 2 + 0.25;
    }
}

class Player extends Entity {
    constructor() {
        super();
        this.x = 2 * PLAYER_WIDTH;
        this.y = PLAYER_STARTING_HEIGHT;
        this.sprite = images['player.png'];
        this.speed = 0.1
        this.ammo = 0
        this.missiles = [];
    }

    // This method is called by the game engine when left/right arrows are pressed
    move(direction) {
        if (direction === MOVE_LEFT && this.x > 0) {
            this.x = this.x - PLAYER_WIDTH;
        }
        else if (direction === MOVE_RIGHT && this.x < GAME_WIDTH - PLAYER_WIDTH) {
            this.x = this.x + PLAYER_WIDTH;
        }
        else if (direction === MOVE_UP && this.y > PLAYER_MAX_HEIGHT) {
            this.y = this.y - PLAYER_HEIGHT;
        }
        else if (direction === MOVE_DOWN && this.y < PLAYER_STARTING_HEIGHT) {
            this.y = this.y + PLAYER_HEIGHT;
        }
        console.log('--> player now at (' + this.x + ', ' + this.y + ')')
    }

    update(timeDiff) {
        if (this.y < PLAYER_STARTING_HEIGHT) {
            this.y = this.y + timeDiff * this.speed
        }
    }

    collect_ammo(dropped_ammo) {
        dropped_ammo.forEach((ammo, ammoIdx) => {
            if (this.x == ammo.x && this.y > ammo.y && this.y <= ammo.y + AMMO_HEIGHT) {
                this.ammo += ammo.rounds
                console.log('LOG: collected ' + ammo.rounds + ' rounds. Ammo now: ' + this.ammo)
                delete dropped_ammo[ammoIdx]
            }
        })
    }

    fire_ze_missiles() {
        if (this.ammo > 0) {
            this.missiles.push(new Missile(this.x, this.y))
            this.ammo -= 1
        }
    }
}

class Ammo extends FallingThing {
    constructor(xPos) {
        super();
        this.x = xPos
        this.y = -AMMO_HEIGHT
        this.sprite = images['ammo.png']

        // Each enemy should have a different speed
        this.speed = Math.random() / 2 + 0.25;

        this.rounds = 1
    }
}

class Missile extends Entity {
    constructor(xPos, yPos) {
        super();
        this.x = xPos;
        this.y = yPos;
        this.sprite = images['missile.png'];
        this.speed = 0.5
        this.targetPos = this.x / ENEMY_WIDTH
    }

    update(timeDiff) {
        this.y = this.y - timeDiff * this.speed;
    }

    destroyed_the_target(targets) {
        var target = targets[this.targetPos]
        if (target && this.y + MISSILE_HEIGHT/2 <= target.y + ENEMY_HEIGHT) {
            delete targets[this.targetPos]
            return true
        }
    }
}





/*
This section is a tiny game engine.
This engine will use your Enemy and Player classes to create the behavior of the game.
The engine will try to draw your game at 60 frames per second using the requestAnimationFrame function
*/
class Engine {
    constructor(element) {
        // Setup the player
        this.player = new Player();

        // Setup enemies, making sure there are always three
        this.setup_falling_things(Enemy, 'enemies', MAX_ENEMIES);
        this.setup_falling_things(Ammo, 'dropped_ammo', MAX_AMMO);

        // Setup the <canvas> element where we will be drawing
        var canvas = document.createElement('canvas');
        canvas.width = GAME_WIDTH;
        canvas.height = GAME_HEIGHT;
        element.appendChild(canvas);

        this.ctx = canvas.getContext('2d');

        // Since gameLoop will be called out of context, bind it once here.
        this.gameLoop = this.gameLoop.bind(this);
        this.drawEverything = this.drawEverything.bind(this)
    }

    drawEverything() {
        this.ctx.drawImage(images['stars.png'], 0, 0); // draw the star bg
        [ // array of entity arrays
            this.enemies,
            this.dropped_ammo,
            this.player.missiles
        ].forEach(entity_type => {
            entity_type.forEach(entity => entity.render(this.ctx))
        })
        this.player.render(this.ctx); // draw the player

        this.ctx.fontSize = FONT_SIZE;
        this.ctx.font = 'bold ' + this.ctx.fontSize + 'px Impact';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(Math.floor(this.score/100), 5, FONT_SIZE);
        this.ctx.drawImage(images['ammo_stash.png'], 5, GAME_HEIGHT - FOOTER_HEIGHT)
        this.ctx.fillText(this.player.ammo, 5 + 40, GAME_HEIGHT - 10)

    }

    /*
     The game allows for 5 horizontal slots where an enemy can be present.
     At any point in time there can be at most max_of_type entities otherwise the game would be impossible
     */
    setup_falling_things(entity_type, entity_array, max_of_type) {
        if (!this[entity_array]) {
            this[entity_array] = [];
        }

        while (this[entity_array].filter(a => !!a).length < max_of_type) {
            this.add_falling_thing(entity_type, this[entity_array]);
        }
    }

    // This method finds a random spot in the array of entities where there is no entity, and puts one in there
    add_falling_thing(entity_type, entity_array) {
        var spots = GAME_WIDTH / COLUMN_WIDTH;
        var spot;
        // Keep looping until we find a free spot at random
        while (entity_array[spot]) {
            spot = Math.floor(Math.random() * spots);
        }
        // Add new entity at the selected spot in the array
        entity_array[spot] = new entity_type(spot * COLUMN_WIDTH);
    }

    // This method kicks off the game
    start() {
        this.score = 0;
        this.lastFrame = Date.now();

        // Listen for keyboard left/right and update the player
        document.addEventListener('keydown', e => {
            if (e.keyCode === LEFT_ARROW_CODE) {
                this.player.move(MOVE_LEFT);
            }
            else if (e.keyCode === RIGHT_ARROW_CODE) {
                this.player.move(MOVE_RIGHT);
            }
            else if (e.keyCode === UP_ARROW_CODE) {
                this.player.move(MOVE_UP);
            }
            else if (e.keyCode === DOWN_ARROW_CODE) {
                this.player.move(MOVE_DOWN);
            }
            else if (e.keyCode === SPACE_BAR_CODE) {
                this.player.fire_ze_missiles()
            }
        });

        this.gameLoop();
    }

    /*
    This is the core of the game engine. The `gameLoop` function gets called ~60 times per second
    During each execution of the function, we will update the positions of all game entities
    It's also at this point that we will check for any collisions between the game entities
    Collisions will often indicate either a player death or an enemy kill

    In order to allow the game objects to self-determine their behaviors, gameLoop will call the `update` method of each entity
    To account for the fact that we don't always have 60 frames per second, gameLoop will send a time delta argument to `update`
    You should use this parameter to scale your update appropriately
     */
    gameLoop() {
        // Check how long it's been since last frame
        var currentFrame = Date.now();
        var timeDiff = currentFrame - this.lastFrame;

        // Increase the score!
        this.score += timeDiff;

        // Call update on all of the entities
        [ // array of entity arrays
            this.enemies,
            this.dropped_ammo,
            this.player.missiles
        ].forEach(entity_type => {
            entity_type.forEach(entity => entity.update(timeDiff))
        })
        this.player.update(timeDiff)

        // Check if any missiles have made contact
        this.player.missiles.forEach((missile, missileIdx) => {
            if (missile.destroyed_the_target(this.enemies)) {
                delete this.player.missiles[missileIdx]
            }
        })

        this.player.collect_ammo(this.dropped_ammo)

        // Draw everything!
        this.drawEverything()

        // Check if any enemies should die
        this.enemies.forEach((enemy, enemyIdx) => {
            if (enemy.y > GAME_HEIGHT) {
                delete this.enemies[enemyIdx];
            }
        });
        this.setup_falling_things(Enemy, 'enemies', MAX_ENEMIES);

        // Check if any ammo should die
        this.dropped_ammo.forEach((ammo, ammoIdx) => {
            if (ammo.y > GAME_HEIGHT) {
                delete this.dropped_ammo[ammoIdx];
            }
        });
        this.setup_falling_things(Ammo, 'dropped_ammo', MAX_AMMO);

        //Check if any missiles should die
        this.player.missiles.forEach((missile, missileIdx) => {
            if (missile.y < 0 - MISSILE_HEIGHT) {
                delete this.player.missiles[missileIdx];
            }
        })

                
        // Check if player is dead
        if (this.isPlayerDead()) {
            // If they are dead, then it's game over!
            this.player.sprite = images['skull.png'];
            this.drawEverything()
            var game_over_text = 'GAME OVER'
            this.ctx.fillText(game_over_text, GAME_WIDTH/2 - this.ctx.measureText(game_over_text).width/2, FONT_SIZE)
        }
        else {
            // Set the time marker and redraw
            this.lastFrame = Date.now();
            requestAnimationFrame(this.gameLoop);
        }
    }

    isPlayerDead() {
        return this.enemies.some(enemy => (
            this.player.x == enemy.x && this.player.y <= (enemy.y + ENEMY_HEIGHT) && this.player.y > (enemy.y + ENEMY_HEIGHT/2)
        ))
    }
}





// This section will start the game
var gameEngine = new Engine(document.getElementById('app'));
gameEngine.start();
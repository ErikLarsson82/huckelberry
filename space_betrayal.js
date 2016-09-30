var version = "0.4";

console.log('Playing version ' + version);

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var INTERVAL_DURATION = 1000/60;

var HALTED = true;
var DISABLE_VISUALTICK = false;
var DISABLE_RENDER = false;

var SCENARIO = false;

var DEBUG_SEED = parseInt(getParameterByName('seed'));

var LOCKED = "Locked";

var INFINITE = 99999999999;

var canvas = document.getElementById('canvas');
var context = canvas.getContext("2d");

var shipImg = new Image();
shipImg.src = "ship.png";

var door_unlocked_closed_vertical = new Image();
door_unlocked_closed_vertical.src = "door_unlocked_closed_vertical.png";
var door_unlocked_closed_horizontal = new Image();
door_unlocked_closed_horizontal.src = "door_unlocked_closed_horizontal.png";
var door_locked_closed_vertical = new Image();
door_locked_closed_vertical.src = "door_locked_closed_vertical.png";
var door_locked_closed_horizontal = new Image();
door_locked_closed_horizontal.src = "door_locked_closed_horizontal.png";
var door_open_vertical = new Image();
door_open_vertical.src = "door_open_vertical.png";
var door_open_horizontal = new Image();
door_open_horizontal.src = "door_open_horizontal.png";


var crateImg = new Image();
crateImg.src = "crate.png";

var medstationImg = new Image();
medstationImg.src = "medstation.png";

var controlpanelImg = new Image();
controlpanelImg.src = "controlpanel.png";

var profile1 = new Image();
profile1.src = "profile1.png";

var profile2 = new Image();
profile2.src = "profile2.png";

var alienImg = new Image();
alienImg.src = "alien.png";
var alienBrawlImg = new Image();
alienBrawlImg.src = "alien_brawl.png";
var alienWalkingImg = new Image();
alienWalkingImg.src = "alien_walking.png";
var alienBrawlPunchingImg = new Image();
alienBrawlPunchingImg.src = "alien_brawl_punching.png";
var alienUnconsciousImg = new Image();
alienUnconsciousImg.src = "alien_unconscious.png";

var banditImg = new Image();
banditImg.src = "bandit.png";
var banditBrawlImg = new Image();
banditBrawlImg.src = "bandit_brawl.png";
var banditBrawlPunchingImg = new Image();
banditBrawlPunchingImg.src = "bandit_brawl_punching.png";
var banditUnconsciousImg = new Image();
banditUnconsciousImg.src = "bandit_unconsious.png";

var linkImg = new Image();
linkImg.src = "link.png";
var linkWalkingImg = new Image();
linkWalkingImg.src = "link_walking.png";
var linkBrawlImg = new Image();
linkBrawlImg.src = "link_brawl.png";
var linkBrawlPunchingImg = new Image();
linkBrawlPunchingImg.src = "link_brawl_punching.png";
var linkUnconsciousImg = new Image();
linkUnconsciousImg.src = "link_unconsious.png";

var linkPurpleImg = new Image();
linkPurpleImg.src = "link_purple.png";
var linkPurpleWalkingImg = new Image();
linkPurpleWalkingImg.src = "link_purple_walking.png";

canvas.oncontextmenu = function() {
   return false;
}

var mousePressedPerson = null;
var mouseDoorToggleMode = null;

var detectHits = function(list, e) {
    return _.filter(list, function(item) {
        if (!item.dimensions) {
            console.error("Dimensions not found on item");
            return false;
        }
        return (e.x > item.dimensions[0] &&
            e.x < item.dimensions[0] + item.dimensions[2] &&
            e.y > item.dimensions[1] &&
            e.y < item.dimensions[1] + item.dimensions[3]);
    });
}

document.addEventListener("mousemove", function(e) {
    if (fullScreenPopupVisible()) return;

    _.each(ship.rooms, function(room) {
        room.hover = false;
        _.each(room.entities, function(entity) {
            entity.hover = false;
        })
    });

    var hits = [];
    if (mouseDoorToggleMode) {
        _.each(doors, function(door) {
            door.hover = false;
        });
        hits = detectHits(doors, e);
    } else {
        hits = detectHits(ship.rooms, e);
        _.each(ship.rooms, function(room) {
            hits = hits.concat(detectHits(room.entities, e))
        });        
    }

    _.each(hits, function(hit) {
        if (!hit.isHoverable) return;
        hit.hover = hit.hoverCondition();
    });

    /*var foundSuitable = false;
    var hitsWithConditions = _.filter(hits, function(hit) {
        var hitCon = hit.hoverCondition();
        if (hitCon && mousePressedPerson && !(hit instanceof Room)) {
            toolTip.visible = true;
            foundSuitable = true;
            toolTip.x = hit.dimensions[0] + 20;
            toolTip.y = hit.dimensions[1] - 30;
        }
        hit.hover = hitCon;
        return hitCon;
    });

    if (!foundSuitable) {
        toolTip.visible = false;
        toolTip.x = 0;
        toolTip.y = 0;
    }*/
});

function resetMousePress() {
    if (mousePressedPerson) mousePressedPerson.selected = false;
    mousePressedPerson = null;
    mouseDoorToggleMode = null;
    _.each(doors, function(door) {
        door.hover = false;
    });
}

function leftClick(e) {
    var hits = detectHits(crew, e);

    if (hits.length > 0) {
        resetMousePress();
        mousePressedPerson = hits[0];
        hits[0].selected = true;
    } else {
        resetMousePress();
    }
}

function rightClickWhilePersonSelected(e) {
    var hits = detectHits(ship.rooms, e);
    _.each(ship.rooms, function(room) {
        hits = hits.concat(detectHits(room.entities, e))
    });

    if (hits.length > 0) mousePressedPerson.removeAllQueue();
    _.each(hits, function(hit) {
        if (hit instanceof Room && findInWhatRoom(mousePressedPerson) !== hit) {
            if (!mousePressedPerson.isWalkable) return;

            var route = findRoute(findInWhatRoom(mousePressedPerson), hit);
            _.each(route, function(nextRoom) {
                mousePressedPerson.addToQueue(mousePressedPerson.generateWalkAction(nextRoom));
            });

        } else if (hit.enemy) {
            if (hit.isConsciousable && !hit.unconsius) {
                mousePressedPerson.isBrawlable && mousePressedPerson.addToQueue(mousePressedPerson.generateBrawlAction(hit))
            }
        } else if (hit.friend && isInSameRoom(mousePressedPerson, hit)) {
            if (hit.isConsciousable && hit.unconsius) {
                hit.unconsius = false;
                hit.health = 2;
                var x = hit.dimensions[0] + Math.floor(Math.random() * 5);
                var y = hit.dimensions[1] - 8 - Math.floor(Math.random() * 10);
                gameObjects.push(new DamageTick(x, y, 2, "green"));
            } else {

                var healed = healWithMedkitIfApplicable(mousePressedPerson, hit);
                var scanned = openScannerIfApplicable(mousePressedPerson, hit);

                if (!healed && !scanned) {
                    if (mousePressedPerson.isInventoryable && hit.isInventoryable) {
                        inventoryTransfer.transfer(mousePressedPerson, hit);
                    }
                }
            }
        } else if (mousePressedPerson.isInventoryable && hit.isInventoryable && isInSameRoom(mousePressedPerson, hit)) {
            inventoryTransfer.transfer(mousePressedPerson, hit);
        } else if (hit.isActionable) {
            hit.action(mousePressedPerson);
        } else if (mousePressedPerson === hit) {
            healWithMedkitIfApplicable(mousePressedPerson, mousePressedPerson);
        } else {
            console.log('No action');
        }
    });
}

function rightClickWhileDoorToggleMode(e) {
    var hits = detectHits(doors, e);
    if (hits.length > 0) {
        hits[0].action();
    }
}

function genericMousePress(e) {
    if (e.button === 0) {
        leftClick(e);
    } else if (e.button === 2) {
        if (mousePressedPerson) {
            rightClickWhilePersonSelected(e);  
        } else if (mouseDoorToggleMode) {
            rightClickWhileDoorToggleMode(e);
        }
    }

}

document.addEventListener("mousedown", function(e) {
    if (inventoryTransfer.visible) {
        inventoryTransfer.mouseEvent(e);
    } else if (scanner.visible) {
        scanner.mouseEvent(e);
    } else if (controlpanelPopup.visible) {
        controlpanelPopup.mouseEvent(e);
    } else {
        genericMousePress(e);
    }
});

document.addEventListener("keydown", function(e) {
    if (e.code === "Space") {
        if (HALTED) {
            HALTED = false;
            console.log("Simulation resumed");
        } else {
            HALTED = true;
            console.log("Simulation paused!");
        }
    } else if (e.keyCode === 68) {
        //D
        /*if (mousePressedPerson) {
            mousePressedPerson.queue[0] && mousePressedPerson.queue.shift()
        }*/
    } else if (e.keyCode === 80) {
        //P
        DISABLE_RENDER = !DISABLE_RENDER;
        DISABLE_VISUALTICK = !DISABLE_VISUALTICK;
    } else if (e.keyCode === 67) {
        cycleInventory(mousePressedPerson);
    }
});


// Setup seed

var randomSeed = Math.round(Math.random() * 10000);
var seed = (DEBUG_SEED) ? DEBUG_SEED : randomSeed;
console.log("Using seed " + seed);
Math.seedrandom(seed);

var DamageTick = function(x, y, amount, color) {
    var ticker = new GameObject();
    ticker.time = 180;
    ticker.color = color || "red";
    ticker.x = x + Math.floor(Math.random() * 10);
    ticker.y = y + Math.floor(Math.random() * 10);
    ticker.markedForRemoval = false;
    ticker.visualTick = function() {
        this.time -= 1;
        if (this.time < 0) {
            this.markedForRemoval = true;
        }
    }
    ticker.draw = function() {
        context.font = "bold 12px Arial";
        context.fillStyle = "black";
        context.fillText(amount, this.x, this.y - 1 - (180 - this.time) / 5);

        context.fillStyle = this.color;
        context.fillText(amount, this.x -1, this.y - 1 - (180 - this.time) / 5);
    }
    return ticker;
}

function mixinWalkerAI(object) {
    var preserveTick = object.tick;
    var max = 100;
    var counter = max;
    object.tick = function() {
        preserveTick && preserveTick();
        counter -= 1;
        if (counter < 0) {
            counter = max;
            var room = findInWhatRoom(object);
            var randomConnectedRoom = room.connections[Math.floor(Math.random() * room.connections.length)];
            executeMove(object, randomConnectedRoom);
        }
    }
}

// Enabled mixin syntax like this: class Alien extends mix(GameObject).with(Health, AlienAI, Walk) { 
const mix = (superclass) => new MixinBuilder(superclass);

class MixinBuilder {  
  constructor(superclass) {
    this.superclass = superclass;
  }

  with(...mixins) { 
    return mixins.reduce((c, mixin) => mixin(c), this.superclass);
  }
}

class Entity {
    constructor(data) {
        _.extend(this, data);
        if (data.tick) {
            this.tick = data.tick;
        }
    }
    tick() {}
    draw() {}
}

const ActionQueue = (superclass) => class extends superclass {
    constructor(data) {
        super(data);
        this.queue = [];
        this.actions = [];
    }
    addToQueue(action) {
        this.queue.push(action);
    };
    removeAllQueue() {
        if (this.queue[0]) {
            this.queue[0].abort.call(this);
        }
        this.queue = [];
    };
    tick() {
        if (this.queue.length > 0) {
            var currentQueueItem = this.queue[0];
            var result = currentQueueItem.tick(currentQueueItem.duration);
            if (result !== true) {
                this.queue.shift();
            } else {
                currentQueueItem.duration = currentQueueItem.duration - 1;
                if (currentQueueItem.duration < 0) {
                    this.queue.shift();
                }
            }
        }
        super.tick()
    }
}

const Action = (superclass) => class extends superclass {
    constructor(data) {
        super(data);
        this.isActionable = true;
        this.action = data.action;
    }
}

const Walk = (superclass) => class extends superclass {
    constructor(data) {
        super(data);
        this.walking = false;
        this.isWalkable = true;
    }
    generateWalkAction(where) {
        return {
            where: where,
            who: this,
            name: "Move",
            duration: 95,
            abort: function() {
                this.walking = false;
            },
            tick: function(duration) {
                var door = findDoor(findInWhatRoom(this), where);
                if (!door) {
                    return false;
                }
                if (isLegalMove(this, where) && !door.locked) {
                    door.open = true;
                } else {
                    this.walking = false;
                    door.open = false;
                    return false;
                }
                this.walking = true;
                if (duration === 0) {
                    this.walking = false;
                    door.open = false;
                    return executeMove(this, where);
                }
                return true;
            }.bind(this)
        }
    }
}

const Brawl = (superclass) => class extends superclass {
    constructor(data) {
        super(data);
        this.punchingPower = data.punchingPower;
        this.brawling = false;
        this.punching = false;
        this.isBrawlable = true;
    }
    generateBrawlAction(whom) {
        var counter = 100;
        return {
            who: this,
            target: whom,
            name: "Brawl",
            duration: INFINITE,
            abort: function() {
                this.brawling = false;
                this.punching = false;
            },
            tick: function(duration) {
                counter -= 1;
                this.brawling = true;
                if (counter === 20) {
                    if (findInWhatRoom(this) !== findInWhatRoom(whom) || whom.unconsius) {
                        this.brawling = false;
                        this.punching = false;
                        return false;
                    } else {
                        var dmg = this.punchingPower;
                        if (this.isInventoryable && this.inventory.length > 0) {
                            dmg = this.inventory[0].dmg || 0;
                        }
                        whom.hurt(dmg);
                        this.punching = true;
                    }
                } else if (counter < 0) {
                    counter = 100;
                    this.punching = false;
                }
                return true;
            }.bind(this)
        }
    }
}

const Inventory = (superclass) => class extends superclass { 
    constructor(data) {
        super(data);
        this.isInventoryable = true;
        this.inventory = [];
    }
    draw() {
        super.draw();

        if (mousePressedPerson === this) {
            context.fillStyle = "gray";
            context.fillRect(800, 550, 180, 150)
            context.fillStyle = "white";
            context.fillText("Inventory (C to cycle):", 810, 570);

            _.each(this.inventory, function(item, idx) {
                var append = "";
                if (idx === 0) append = " [ACTIVE]";
                context.fillText(item.name + append, 810, 570 + 20 + (idx * 20));
            })
        }
    }
}


const BrawlAI = (superclass) => class extends superclass {
    constructor(data) {
        super(data);
    }
    tick() {
        var opponents = _.filter(findInWhatRoom(this).entities, function(entity) {
            return entity.health && entity !== this && entity.friend && !entity.unconsius;
        }.bind(this));
        var opponent = opponents[Math.floor(Math.random() * opponents.length)];
        const gotSomeQueueAndItsNotBrawling = (this.queue.length > 0 && this.queue[0].name !== "Brawl");
        const isBrawling = (this.queue.length > 0 && this.queue[0].name === "Brawl");
        if (opponent) {
            if (gotSomeQueueAndItsNotBrawling) {
                this.removeAllQueue();
            }
            if (!isBrawling) {
                this.addToQueue(this.generateBrawlAction(opponent));
            }
        }
        super.tick();
    }
}

const HuntAI = (superclass) => class extends superclass {
    tick() {
        if (this.queue.length === 0) {
            var room = findInWhatRoom(this);
            var roomsWithPeople = connectedRoomsWithPeople(room);
            if (roomsWithPeople) {
                this.addToQueue(this.generateWalkAction(roomsWithPeople[Math.floor(Math.random() * roomsWithPeople.length)]));
            } else {
                this.addToQueue(this.generateWalkAction(room.connections[Math.floor(Math.random() * room.connections.length)]));
            }
        }
        super.tick();
    }
}


const Health = (superclass) => class extends superclass {
    constructor(data) {
        super(data);
        this.maxHealth = data.health;
        this.health = data.health;
        this.unconsius = false;
        this.isConsciousable = true;
    }
    resetIfSelected() {
        if (this === mousePressedPerson) resetMousePress();
    }
    tick() {
        if (this.health < 1) {
            this.resetIfSelected();
            this.unconsius = true;
            this.queue.length = 0;
        } else {
            super.tick();
        }
    }
    hurt(dmg) {
        var x = this.dimensions[0] + Math.floor(Math.random() * 5);
        var y = this.dimensions[1] - 8 - Math.floor(Math.random() * 10);
        gameObjects.push(new DamageTick(x, y, -dmg));
        this.health = this.health - dmg;
    }
}



const Render = (superclass) => class extends superclass {
    draw() {
        var img = this.img;
        if (this.walking) img = this.imgWalking;
        if (this.brawling) img = this.imgBrawling;
        if (this.punching) img = this.imgPunching;
        if (this.unconsius) img = this.imgUnconscious;

        context.drawImage(img, this.dimensions[0], this.dimensions[1]);
        var name = "-";
        if (this.queue && this.queue.length > 0) {
            name = this.queue[0].name;
        }
        context.fillStyle = "white";
        context.fillText(name, this.dimensions[0], this.dimensions[1] + 45);

        if (this.profile && mousePressedPerson === this) {
            context.drawImage(this.profile, 90, 520)
        }
    }
}


const Select = (superclass) => class extends superclass {
    constructor(data) {
        super(data);
        if (data && !data.hoverCondition) console.warn('Using Select without hoverCondition');
        this.hover = false;
        this.isHoverable = true;
        this.selected = false;
    }
    draw() {
        super.draw();
        if (this.selected) {
            context.beginPath();
            context.strokeStyle = "#f00";
            context.rect.apply(context, this.dimensions);
            context.stroke();
        } else if (this.hover) {
            context.beginPath();
            context.strokeStyle = "#00f";
            context.rect.apply(context, this.dimensions);
            context.stroke();
        }
    }
}

class Player extends mix(Entity).with(Render, Select, Inventory, Walk, Brawl, ActionQueue, Health) {}
class Medic extends mix(Entity).with(Render, Select, Inventory, Walk, Brawl, ActionQueue, Health) {}

class Alien extends mix(Entity).with(Render, Select, Walk, Brawl, HuntAI, BrawlAI, ActionQueue, Health) {}
class Bandit extends mix(Entity).with(Render, Select, Brawl, BrawlAI, ActionQueue, Health) {}

class Crate extends mix(Entity).with(Render, Select, Inventory) {}
class ActionStation extends mix(Entity).with(Render, Select, Action) {}

var player = new Player({
    name: "You",
    friend: true,
    img: linkImg,
    profile: profile1,
    imgWalking: linkWalkingImg,
    imgBrawling: linkBrawlImg,
    imgPunching: linkBrawlPunchingImg,
    imgUnconscious: linkUnconsciousImg,
    dimensions: [0, 0, 33, 33],
    punchingPower: 2,
    health: 10,
    hoverCondition: function() {
        return this.isConsciousable && !this.unconsius && !mouseDoorToggleMode;
    }
});

var medic = new Medic({
    name: "Medic",
    friend: true,
    img: linkPurpleImg,
    profile: profile2,
    imgWalking: linkPurpleWalkingImg,
    imgBrawling: linkBrawlImg,
    imgPunching: linkBrawlPunchingImg,
    imgUnconscious: linkUnconsciousImg,
    dimensions: [0, 0, 33, 33],
    punchingPower: 2,
    health: 10,
    hoverCondition: function() {
        return this.isConsciousable && !this.unconsius && !mouseDoorToggleMode;
    }
});

var crates = [];
_.each(new Array(3), function(unused, idx) {
    var crate = new Crate({
        name: "Crate " + idx,
        img: crateImg,
        dimensions: [0, 0, 33, 33],
        hoverCondition: () => !!mousePressedPerson
    });
    crates.push(crate);
})

var medbays = [
    new Crate({
        name: "Medbay",
        img: medstationImg,
        dimensions: [0, 0, 33, 33],
        hoverCondition: () => !!mousePressedPerson
    })
];


var controlpanel = new ActionStation({
    name: "controlpanel",
    img: controlpanelImg,
    dimensions: [0, 0, 33, 33],
    hoverCondition: () => !!mousePressedPerson,
    action: function(whom) { if (isInSameRoom(whom, this)) controlpanelPopup.open() }
});

var Item = function() {};

var pistol = new Item();
pistol.name = "Pistol";
pistol.dmg = 10;

var lazergun = new Item();
lazergun.name = "Lazer Gun";
lazergun.dmg = 20;

var baseballbat = new Item();
baseballbat.name = "Baseball bat";
baseballbat.dmg = 5;

var items = [pistol, lazergun, baseballbat];

var scannerItem = new Item();
scannerItem.name = "Scanner";
var healthkit1 = new Item();
healthkit1.name = "Health kit";
healthkit1.healing = true;
var healthkit2 = new Item();
healthkit2.name = "Health kit";
healthkit2.healing = true;

medbays[0].inventory.push(scannerItem);
medbays[0].inventory.push(healthkit1);
medbays[0].inventory.push(healthkit2);


var GameObject = function(tick, visualTick, draw) {
    this.tick = tick || function() {};
    this.visualTick = visualTick || function() {};
    this.draw = draw || function() {};
}

var gameObjects = [];

var scanner = new GameObject();
scanner.name = "Scanner";
scanner.visible = false;
scanner.open = function(whom) {
    this.visible = true;
    this.whom = whom;
}
scanner.mouseEvent = function(e) {
    var closeButton = {
        dimensions: [784, 114, 54, 54],
        action: function() {
            scanner.visible = false;
        }
    }
    var hits = detectHits([closeButton], e);

    if (hits.length > 0) {
        hits[0].action();
    }
}
scanner.draw = function() {
    if (!this.visible) return;

    context.fillStyle = "rgba(0,0,0,.8)";
    context.fillRect(0, 0, 1024, 768);
    context.fillStyle = "#aaaaaa";
    context.fillRect(244, 170, 533, 395);
    context.fillStyle = "#333333";
    context.fillRect(258, 186, 520, 370);

    context.fillStyle = "white";
    context.font = "12px Arial";
    context.fillText(this.whom.name, 350, 350);
    context.fillText("Health: " + this.whom.health + " / " + this.whom.maxHealth, 350, 390);
    context.fillText("Punch power: " + this.whom.punchingPower, 350, 430);

    context.fillStyle = "red";
    context.fillRect(784, 114, 54, 54);
}
gameObjects.push(scanner);


var inventoryTransfer = new GameObject();
inventoryTransfer.name = "InventoryTransfer";
inventoryTransfer.visible = false;
inventoryTransfer.transfer = function(from, to) {
    this.visible = true;
    this.from = from;
    this.to = to;
}
inventoryTransfer.mouseEvent = function(e) {
    var closeButton = {
        dimensions: [784, 114, 54, 54],
        action: function() {
            inventoryTransfer.visible = false;
        }
    }
    var elements = [];
    function generateButtons(from, to, offset) {
        _.each(from.inventory, function(item, idx) {
            elements.push({
                dimensions: [270 + 8 + offset, 200 + (idx * 20), 100, 17],
                action: function() {
                    from.inventory = _.filter(from.inventory, function(item2) {
                        return item !== item2;
                    });
                    to.inventory.push(item);
                }
            });
        });
    }
    generateButtons(inventoryTransfer.from, inventoryTransfer.to, 0);
    generateButtons(inventoryTransfer.to, inventoryTransfer.from, 253);

    elements.push(closeButton);
    var hits = detectHits(elements, e);

    if (hits.length > 0) {
        hits[0].action();
    }
}

inventoryTransfer.draw = function() {
    if (!this.visible) return;

    context.fillStyle = "rgba(0,0,0,.8)";
    context.fillRect(0, 0, 1024, 768);
    context.fillStyle = "#aaaaaa";
    context.fillRect(244, 170, 533, 395);
    context.fillStyle = "#333333";
    context.fillRect(258, 186, 520, 370);

    context.fillStyle = "white";
    context.font = "12px Arial";

    if (this.from.inventory.length > 0) {
        _.each(this.from.inventory, function(item, idx) {
            context.fillStyle = "black";
            context.fillRect(270 + 8, 200 + (idx * 20), 100, 17);
            context.fillStyle = "white";
            context.fillText(item.name, 270 + 8, 200 + 12 + (idx * 20));
        })
    } else {
        context.fillText("Empty", 270, 200);
    }

    if (this.to.inventory.length > 0) {
        _.each(this.to.inventory, function(item, idx) {
            context.fillStyle = "black";
            context.fillRect(520 + 8, 200 + (idx * 20), 100, 17);
            context.fillStyle = "white";
            context.fillText(item.name, 520 + 8, 200 + 12 + (idx * 20));
        })
    } else {
        context.fillText("Empty", 520, 200);
    }

    context.fillStyle = "red";
    context.fillRect(784, 114, 54, 54);
}

gameObjects.push(inventoryTransfer);



var controlpanelPopup = new GameObject();
controlpanelPopup.name = "ControlpanelPopup";
controlpanelPopup.visible = false;
controlpanelPopup.open = function() {
    this.visible = true;
}
controlpanelPopup.mouseEvent = function(e) {
    var closeButton = {
        dimensions: [784, 114, 54, 54],
        action: function() {
            controlpanelPopup.visible = false;
        }
    }
    var lockDoorsButton = {
        dimensions: [300, 250, 200, 100],
        action: function() {
            modifyAllDoorsStatus(true, false);
            controlpanelPopup.visible = false;
        }
    }
    var unlockDoorsButton = {
        dimensions: [550, 250, 200, 100],
        action: function() {
            modifyAllDoorsStatus(false, false);
            controlpanelPopup.visible = false;
        }
    }
    var toggleDoorsButton = {
        dimensions: [300, 400, 200, 100],
        action: function() {
            resetMousePress();
            mouseDoorToggleMode = true;
            controlpanelPopup.visible = false;
        }
    }
    var hits = detectHits([closeButton, lockDoorsButton, unlockDoorsButton, toggleDoorsButton], e);

    if (hits.length > 0) {
        hits[0].action();
    }
}
controlpanelPopup.draw = function() {
    if (!this.visible) return;

    context.fillStyle = "rgba(0,0,0,.8)";
    context.fillRect(0, 0, 1024, 768);
    context.fillStyle = "#aaaaaa";
    context.fillRect(244, 170, 533, 395);
    context.fillStyle = "#333333";
    context.fillRect(258, 186, 520, 370);


    context.fillStyle = "#cccccc";
    context.fillRect(300, 250, 200, 100);
    
    context.fillStyle = "#cccccc";
    context.fillRect(550, 250, 200, 100);

    context.fillStyle = "#cccccc";
    context.fillRect(300, 400, 200, 100);
    context.fillStyle = "black";
    context.font = "12px Arial";
    context.fillText("Toggle mode", 320, 420)
    context.fillText("Unlock all doors", 570, 270)
    context.fillText("Lock all doors", 320, 270)

    context.fillStyle = "red";
    context.fillRect(784, 114, 54, 54);
}

gameObjects.push(controlpanelPopup);



var toolTip = new GameObject();
toolTip.name = "Tooltip";
toolTip.x = 50;
toolTip.y = 50;
toolTip.visible = false;
toolTip.action = "-";
toolTip.draw = function() {
    if (!this.visible || fullScreenPopupVisible()) return;

    context.fillStyle = "#222222";
    context.fillRect(this.x, this.y, 100, 30);
    context.fillStyle = "white";
    context.font = "12px Arial";
    context.fillText(this.action, this.x + 8, this.y + 20);
}
gameObjects.push(toolTip);

class Room extends mix(Entity).with(Select) {
    constructor(data) {
        super(data);
        this.name = name;
        this.connections = [];
        this.entities = [];
        this.dimensions = data.dimensions;
        this.activated = 0;
        this.visualTick = function() {
            if (this.activated > 0) this.activated -= 1;
        }
    }
}


class Door extends mix(Entity).with(Select, Action) {
    constructor(data, from, to, orientation, dimensions, locked, open) {
        super(data);
        this.connections = [from, to];
        this.orientation = orientation;
        this.dimensions = dimensions;
        this.locked = locked;
        this.open = open;
        this.doorStates = {
            true: { // door is open
                true: {
                    true: door_open_vertical,
                    false: door_open_horizontal
                },
                false: {
                    true: door_open_vertical,
                    false: door_open_horizontal
                }
            },
            false: { // closed
                true: { //locked
                    true: door_locked_closed_vertical,
                    false: door_locked_closed_horizontal
                },
                false: { //unlocked
                    true: door_unlocked_closed_vertical,
                    false: door_unlocked_closed_horizontal
                }
            }
        }
    }
    draw() {
        super.draw();
        context.drawImage(this.doorStates[this.open][this.locked][this.orientation], this.dimensions[0], this.dimensions[1]);
    }
}

var timesTwo = function(array) {
    return _.map(array, function(item) {
        return item * 2
    })
}
var roomHoverConditon = function() { return !!mousePressedPerson; }
var roomTick = function() {
    var numberPerRow = 2;

    if (this.dimensions[2] > 165) {
        numberPerRow = 4;
    }
    if (this.dimensions[2] > 225) {
        numberPerRow = 8;
    }
    _.each(this.entities, function(entity, idx) {
        entity.dimensions[0] = this.dimensions[0] + 30 + (45 * (idx % numberPerRow));
        entity.dimensions[1] = this.dimensions[1] + 30 + (45 * Math.floor(idx / numberPerRow));
    }.bind(this));
};
var roomBlob = {
    hoverCondition: roomHoverConditon,
    tick: roomTick
}
var bridge = new Room(_.extend(roomBlob, { name: "Bridge", dimensions: timesTwo([148, 114, 215, 96])}) );
var medbay = new Room(_.extend(roomBlob, { name: "Medbay", dimensions: timesTwo([368, 80, 112, 96])}) );
var storageroom = new Room(_.extend(roomBlob, { name: "Storageroom", dimensions: timesTwo([384, 181, 80, 73])}) );
var kitchen = new Room(_.extend(roomBlob, { name: "Kitchen", dimensions: timesTwo([32, 80, 112, 90])}) );
var engineroom = new Room(_.extend(roomBlob, { name: "Engineroom", dimensions: timesTwo([167, 37, 80, 73])}) );
var bedroom = new Room(_.extend(roomBlob, { name: "Bedroom", dimensions: timesTwo([48, 174, 80, 75])}) );
var shieldroom = new Room(_.extend(roomBlob, { name: "Shieldroom", dimensions: timesTwo([251, 37, 80, 73])}) );
//var escapePod1 = new Room("Escape pod 1", timesTwo([66, 33, 43, 43]));
//var escapePod2 = new Room("Escape pod 2", timesTwo([403, 34, 43, 43]));

var crew = [player, medic] //  , pilot, engineer, warrior];

var doorSelectCondition = function() {
    return !!mouseDoorToggleMode;
};
var doorActionCondition = function() {
    this.locked = !this.locked;
}
var doorDataBlob = {
    hoverCondition: doorSelectCondition,
    action: doorActionCondition
}
var door1 = new Door(doorDataBlob, bedroom, kitchen, false, [112, 324, 48, 48], false, false);
var door2 = new Door(doorDataBlob, kitchen, bridge, true, [272, 268, 48, 48], false, false);
var door3 = new Door(doorDataBlob, engineroom, bridge, false, [352, 204, 48, 48], false, false);
var door4 = new Door(doorDataBlob, engineroom, shieldroom, true, [478, 156, 48, 48], false, false);
var door5 = new Door(doorDataBlob, bridge, medbay, true, [710, 284, 48, 48], false, false);
var door6 = new Door(doorDataBlob, medbay, storageroom, false, [786, 336, 48, 48], false, false);
//var door7 = new Door(kitchen, escapePod1, false, [-100, -100, 48, 48], false, false);
//var door8 = new Door(medbay, escapePod2, false, [-100, -100, 48, 48], false, false);

bridge.connections = [engineroom, kitchen, medbay];
medbay.connections = [storageroom, bridge];
storageroom.connections = [medbay];
kitchen.connections = [bridge, bedroom];
engineroom.connections = [shieldroom, bridge];
bedroom.connections = [kitchen];
shieldroom.connections = [engineroom];
//escapePod1.connections = [kitchen];
//escapePod2.connections = [medbay];

var rooms = [bedroom, kitchen, bridge, engineroom, shieldroom, medbay, storageroom];

/*_.each(rooms, function(room) {
    tickable(room, 
})*/

// Generic functions
function connectedRoomsWithPeople(room) {
    var rooms = _.filter(room.connections, function(room) {
        return _.filter(room.entities, function(entity) {
            return (entity.friend);
        }).length > 0;
    });
    return rooms.length > 0 && rooms;
}

function healWithMedkitIfApplicable(who, whom) {
    if (who.isInventoryable && who.inventory.length > 0 &&
               who.inventory[0].healing) {
        var x = whom.dimensions[0] + Math.floor(Math.random() * 5);
        var y = whom.dimensions[1] - 8 - Math.floor(Math.random() * 10);
        gameObjects.push(new DamageTick(x, y, whom.maxHealth - whom.health, "green"));
        whom.health = whom.maxHealth;
        return true;
    }
    return false;
}

function openScannerIfApplicable(who, whom) {
    if (who.isInventoryable && who.inventory.length > 0 &&
               who.inventory[0].name === "Scanner") {
        scanner.open(whom);
        return true;
    }
    return false;
}

function fullScreenPopupVisible() {
    return inventoryTransfer.visible || scanner.visible || controlpanelPopup.visible;
}

var placeCrewRandomly = function() {
    _.each(crew, function(person) {
        var index = Math.floor(Math.random() * rooms.length);
        rooms[index].entities.push(person);
    })
}

var placeAliensRandomly = function() {
    var amount = Math.floor(Math.random() * 4);
    console.log('Placing ' + amount + " aliens");
    _.each(new Array(amount), function(unused, idx) {
        var alien = new Alien({
            name: "Alien" + idx,
            img: alienImg,
            imgWalking: alienWalkingImg,
            imgBrawling: alienBrawlImg,
            imgPunching: alienBrawlPunchingImg,
            imgUnconscious: alienUnconsciousImg,
            dimensions: [0, 0, 33, 33],
            health: 10,
            punchingPower: 3,
            enemy: true,
            hoverCondition: function() {
                return this.isConsciousable && !this.unconsius && mousePressedPerson;
            }
        });
        
        var roomIndex = Math.floor(Math.random() * rooms.length);
        rooms[roomIndex].entities.push(alien);
    })
}

var placeBanditsRandomly = function() {
    var amount = Math.floor(Math.random() * 3);
    console.log('placing ' + amount + " bandits");
    var roomIndex = Math.floor(Math.random() * rooms.length);

    _.each(new Array(amount), function(unused, idx) {
        var bandit = new Bandit({
            name: "Bandit" + idx,
            img: banditImg,
            imgBrawling: banditBrawlImg,
            imgPunching: banditBrawlPunchingImg,
            imgUnconscious: banditUnconsciousImg,
            dimensions: [0, 0, 33, 33],
            health: 10,
            punchingPower: 5,
            enemy: true,
            hoverCondition: function() {
                return this.isConsciousable && !this.unconsius && mousePressedPerson;
            }
        });
        rooms[roomIndex].entities.push(bandit);
    })
}

var placeCratesRandomly = function() {
    _.each(crates, function(crate) {
        var index = Math.floor(Math.random() * rooms.length);
        rooms[index].entities.push(crate);
    });
};

var placeControlPanelRandomly = function() {
    var index = Math.floor(Math.random() * rooms.length);
    rooms[index].entities.push(controlpanel);
}

var placeMedbayRandomly = function() {
    _.each(medbays, function(medbay) {
        var index = Math.floor(Math.random() * rooms.length);
        rooms[index].entities.push(medbay);
    });
};

var placeItemsRandomly = function() {
    var inventoryCrew = _.filter(crew, function(person) {
        return person.isInventoryable;
    })
    var peopleAndCrates = inventoryCrew.concat(crates);
    _.each(items, function(item) {
        var index = Math.floor(Math.random() * peopleAndCrates.length);
        peopleAndCrates[index].inventory.push(item);
        console.log('placing ' + item.name + " at " + peopleAndCrates[index].name);
    });
};

var doors = [door1, door2, door3, door4, door5, door6];

var ship = {
    rooms: rooms,
    doors: doors
}

var removeQueuedAction = function(who) {
    who.queue.shift();
}

var clearPersonsQueuedActions = function(person) {
    person.queue.length = 0;
}

var clearAllQueuedActions = function() {
    _.each(crew, function(person) {
        person.queue.length = 0;
    });
}

var findDoor = function(from, to) {
    var door = _.filter(doors, function(door) {
        return _.contains(door.connections, from) && _.contains(door.connections, to);
    })
    return (door.length === 1) ? door[0] : alert("Door broken");
}

/*function isAdjacent() {
    var isAdjacent = _.filter(findInWhatRoom(mousePressedPerson).connections, function(connection) {
                return (connection === this);
            }.bind(this)).length > 0;
}*/

// Returns a room
var findInWhatRoom = function(whatOrWho) {
    var room = _.filter(rooms, function(room) {
        var list = _.filter(room.entities, function(entity) {
            return (entity === whatOrWho);
        });
        return list.length > 0;
    });
    return (room.length > 0) ? room[0] : false;
}

var findInWhatRoomByInstanceOf = function(instance) {
    var items = [];
    _.each(rooms, function(room) {
        var list = _.filter(room.items, function(item) {
            return (item instanceof instance);
        });
        items = items.concat(list);
    });
    return (items.length > 0) ? items : false;
}

var modifyAllDoorsStatus = function(locked, open) {
    _.each(doors, function(door) {
        door.locked = locked;
        door.open = open;
    })
}

var findRoute = function(from, to) {
    if (from === to) {
        return [];
    }
    var route = [];
    var visitedRooms = [];
    var routesLeft = true;
    var tries = 0;

    var tryAllRooms = function(currentRoom) {
        tries = tries + 1;
        if (tries > 50) {
            console.log('failsafe in recursive algorithm activated');
            return false;
        }

        visitedRooms.push(currentRoom);
        route.push(currentRoom);

        if (currentRoom === to) {
            return true;
        }

        var gonnaVisit = _.filter(currentRoom.connections, function(room) {
            return (!_.contains(visitedRooms, room));
        })

        var foundIt = false;
        _.each(gonnaVisit, function(room) {
            if (tryAllRooms(room)) {
                foundIt = true;
            } else {
                route.pop();
            }
        })
        if (foundIt) return route;
        return false;
    }
    var route = tryAllRooms(from);
    route.shift();
    return route;
}

function cycleInventory(who) {
    if (who && who.isInventoryable && who.inventory.length > 1) {
        who.inventory.push(who.inventory.shift());
        return true;
    }
    return false;
}

var canBeHit = function(who) {
    return (who.conscious === true && who.hp > 1);
}

var isInSameRoom = function(item1, item2) {
    return findInWhatRoom(item1) === findInWhatRoom(item2);
}

var isBrawling = function(who, what) {
    var specificTargetOrTrue = what ? (who.queue[0] && who.queue[0].what === what) : true;
    return !!(who.conscious && who.queue[0] && who.queue[0].name === "Brawl" && specificTargetOrTrue);
}

var isLegalMove = function(who, where) {
    var legal = true;
    _.each(rooms, function(room) {
        _.each(room.entities, function(entity) {
            if (who === entity) {
                if (!_.contains(room.connections, where)) {
                    legal = false;
                } else {
                    var relevantDoor = findDoor(room, where);
                    if (relevantDoor.status === LOCKED) {
                        legal = false;
                    }
                }
            }
        })
    });
    return legal && !findDoor(findInWhatRoom(who), where).locked;
}

function executeMove(who, where) {
    if (!who) {
        console.log('Who?');
        return false;
    }
    if (!where) {
        console.log('Where?');
        return false;
    }
    var islegal = isLegalMove(who, where)
    if (!islegal) return false;

    rooms =_.each(rooms, function(room) {
        room.entities = _.filter(room.entities, function(person) {
            return !(who === person);
        })
    })

    where.entities.push(who);
    return true;
}

var visualTick = function() {
    _.each(rooms, function(room) {
        room.visualTick();
    });

    _.each(gameObjects, function(object) {
        object.visualTick();
    });

    gameObjects = _.filter(gameObjects, function(object) {
        return !object.markedForRemoval;
    });
}

var gameTick = function() {

    _.each(gameObjects, function(object) {
        object.tick();
    });

    //Tick all items in rooms
    _.each(rooms, function(room) {
        room.tick && room.tick();

        _.each(room.entities, function(entity) {
            entity.tick && entity.tick();
        });
    });

    //Remove items
    _.each(rooms, function(room) {
        room.items = _.filter(room.entities, function(entity) {
            return !(entity.markedForRemoval === true);
        });
    });

    gameObjects = _.filter(gameObjects, function(object) {
        return !object.markedForRemoval;
    });
}

var render = function() {
    context.fillStyle = "#292929";
    context.fillRect(0,0, 1024, 768);
    context.font = "12px Arial";

    context.drawImage(shipImg, 0, 0);

    _.chain(rooms)
        .filter(function(room) {
            return (room.dimensions);
        })
        .each(function(room) {
            room.draw && room.draw();

            _.each(room.entities, function(entity, idx) {
                entity.draw && entity.draw();
            })
        });

    if (mousePressedPerson) {
        context.fillStyle = "white";
        context.font = "12px Arial";
        context.fillText("Queue:", 360, 540);
        _.each(mousePressedPerson.queue, function(item, idx) {
            context.fillText(item.name, 360 + (idx * 120), 560);
        })
    }

    if (HALTED) {
        context.fillStyle = "red";
        context.font = "30px Arial";
        context.fillText("PAUSED", 430, 30);
    }

    if (mouseDoorToggleMode) {
        context.fillStyle = "red";
        context.font = "30px Arial";
        context.fillText("Toggle doors with right click", 320, 60);
    }

    _.each(doors, function(object) {
        object.draw();
    });

    _.each(gameObjects, function(object) {
        object.draw();
    });

    context.fillStyle = "white";
    context.font = "20px Arial";
    context.fillText("Version: " + version, 800, 750);

}

setInterval(function() {
    !HALTED && gameTick();

    !DISABLE_VISUALTICK && visualTick();
    !DISABLE_RENDER && render();

}, INTERVAL_DURATION);

if (SCENARIO !== false) {
    console.log('Using Custom Scenario ' + SCENARIO + ':');
    switch(SCENARIO) {
        case 17:
            bridge.crew = [pilot, warrior];
            var spawningAlien = new Alien();
            bridge.items.push(spawningAlien);
            medbay.crew = [player];
            storageroom.crew = [];
            kitchen.crew = [];
            engineroom.crew = [];
            bedroom.crew = [];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            gameTick();
        break;
    }
} else {

    placeCrewRandomly();

    placeAliensRandomly();

    placeBanditsRandomly();

    placeCratesRandomly();

    placeMedbayRandomly();

    placeItemsRandomly();

    placeControlPanelRandomly();

    gameTick();
}

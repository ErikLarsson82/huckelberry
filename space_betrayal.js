
var INTERVAL_DURATION = 1000/60;

var HALTED = true;
var DISABLE_VISUALTICK = false;
var DISABLE_RENDER = false;

var SCENARIO = false;

var DEBUG_SEED = false;

var LOCKED = "Locked";

var INFINITE = 99999999999;

var canvas = document.getElementById('canvas');
var context = canvas.getContext("2d");

var testImg = new Image();
testImg.src = "test.png";

var profile1 = new Image();
profile1.src = "profile1.png";

var profile2 = new Image();
profile2.src = "profile2.png";

var alienImg = new Image();
alienImg.src = "alien.png";
var alienBrawlImg = new Image();
alienBrawlImg.src = "alien_brawl.png";
var alienBrawlPunchingImg = new Image();
alienBrawlPunchingImg.src = "alien_brawl_punching.png";
var alienUnconsciousImg = new Image();
alienUnconsciousImg.src = "alien_unconscious.png";

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

var detectHits = function(list, e) {
    return _.filter(list, function(item) {
        return (e.x > item.dimensions[0] &&
            e.x < item.dimensions[0] + item.dimensions[2] &&
            e.y > item.dimensions[1] &&
            e.y < item.dimensions[1] + item.dimensions[3]);
    });
}

document.addEventListener("mousemove", function(e) {
    _.each(ship.rooms, function(room) {
        room.hover = false;
        _.each(room.entities, function(entity) {
            entity.hover = false;
        })
    });

    var hits = detectHits(ship.rooms, e);
    _.each(ship.rooms, function(room) {
        hits = hits.concat(detectHits(room.entities, e))
    });

    _.each(hits, function(hit) {
        hit.hover = hit.hoverCondition();
    });
});

document.addEventListener("mousedown", function(e) {
    if (e.button === 0) {
        var hits = detectHits(crew, e);
        
        function reset() {
            if (mousePressedPerson) mousePressedPerson.selected = false;
        } 
        if (hits.length > 0) {
            reset();
            mousePressedPerson = hits[0];
            hits[0].selected = true;
        } else {
            reset();
            mousePressedPerson = null;
        }
    } else if (e.button === 2) {
        if (mousePressedPerson) {
            var hits = detectHits(ship.rooms, e);
            _.each(ship.rooms, function(room) {
                hits = hits.concat(detectHits(room.entities, e))
            });

            if (hits.length > 0) mousePressedPerson.removeAllQueue();
            _.each(hits, function(hit) {
                if (hit instanceof Room && findInWhatRoom(mousePressedPerson) !== hit) {
                    mousePressedPerson.isWalkable && mousePressedPerson.addToQueue(mousePressedPerson.generateWalkAction(hit))
                } else if (hit.enemy) {
                    mousePressedPerson.isBrawlable &&  mousePressedPerson.addToQueue(mousePressedPerson.generateBrawlAction(hit))
                } else if (hit.friend) {
                    console.log('High five');
                }
            });
        }
    }
});

document.addEventListener("keydown", function(e) {
    console.log(e.keyCode);
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
    }
});


// Setup seed

var randomSeed = Math.round(Math.random() * 10000);
var seed = (DEBUG_SEED) ? DEBUG_SEED : randomSeed;
console.log("Using seed " + seed);
Math.seedrandom(seed);

var DamageTick = function(x, y, amount) {
    var ticker = new GameObject();
    ticker.time = 180;
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

        context.fillStyle = "red";
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

function tickable(object, inputFunc) {
    object.tick = inputFunc;
}

function renderable(object) {
    object.draw = function() {
        var img = this.img;
        if (object.walking) img = this.imgWalking;
        if (object.brawling) img = this.imgBrawling;
        if (object.punching) img = this.imgPunching;
        if (object.unconsius) img = this.imgUnconscious;

        context.drawImage(img, this.dimensions[0], this.dimensions[1]);

        if (this.profile && mousePressedPerson === this) {
            context.drawImage(this.profile, 90, 520)
        }
    }
}

function selectable(object, condition) {
    object.hover = false;
    object.selected = false;
    object.hoverCondition = condition;
    var stowDraw = object.draw || function() {};
    object.draw = function() {
        stowDraw.call(object);
        if (object.selected) {
            context.beginPath();
            context.strokeStyle = "#f00";
            context.rect.apply(context, object.dimensions);
            context.stroke();
        } else if (object.hover) {
            context.beginPath();
            context.strokeStyle = "#00f";
            context.rect.apply(context, object.dimensions);
            context.stroke();
        }
    }
}

function walkable(object) {
    object.walking = false;
    object.isWalkable = true;
    object.generateWalkAction = function(where) {
        return {
            where: where,
            who: object,
            name: "Move",
            duration: 120,
            abort: function() {
                this.walking = false;
            },
            event: function(duration) {
                this.walking = true;
                if (duration === 0) {
                    this.walking = false;
                    return executeMove(this, where);
                }
                return true;
            }.bind(object)
        }
    }
}

function healthable(object, health) {
    object.health = health;
    object.unconsius = false;
    object.isConsciousable = true;
    var storeTick = object.tick || function() {};
    object.tick = function() {
        if (object.health < 1) {
            object.unconsius = true;
        } else {
            storeTick.call(object);
        }
    };
    object.hurt = function(dmg) {
        var x = object.dimensions[0] + Math.floor(Math.random() * 5);
        var y = object.dimensions[1] - 8 - Math.floor(Math.random() * 10);
        gameObjects.push(new DamageTick(x, y, -dmg));
        object.health = object.health - dmg;
    }
}

function brawlable(object, punchingPower) {
    object.punchingPower = punchingPower;
    object.brawling = false;
    object.punching = false;
    object.isBrawlable = true;
    object.generateBrawlAction = function(whom) {
        var counter = 100;
        return {
            who: object,
            target: whom,
            name: "Brawl",
            duration: INFINITE,
            abort: function() {
                this.brawling = false;
                this.punching = false;
            },
            event: function(duration) {
                counter -= 1;
                this.brawling = true;
                if (counter === 20) {
                    if (findInWhatRoom(this) !== findInWhatRoom(whom) || whom.unconsius) {
                        this.brawling = false;
                        this.punching = false;
                        return false;    
                    } else {
                        whom.hurt(this.punchingPower);
                        object.punching = true;
                    }
                } else if (counter < 0) {
                    counter = 100;
                    object.punching = false;
                }
                return true;
            }.bind(object)
        }
    }
}

function brawlAI(object) {
    var storeTick = object.tick;
    object.tick = function() {
        storeTick.call(object);

        var opponents = _.filter(findInWhatRoom(this).entities, function(entity) {
            return entity.health && entity !== this && entity.friend && !entity.unconsius;
        }.bind(this));
        var opponent = opponents[Math.floor(Math.random() * opponents.length)];
        if (opponent) {
            if (this.queue.length === 0) this.addToQueue(this.generateBrawlAction(opponent));
        } else {
            this.brawling = false;
            this.punching = false;
            this.queue.length = 0;
        }
    }
}

function actionQueueAble(object) {
    object.queue = [];
    object.addToQueue = function(action) {
        this.queue.push(action);
    };
    object.removeAllQueue = function() {
        if (this.queue[0]) {
            this.queue[0].abort.call(this);
        }
        this.queue = [];
    };
    var storedTick = object.tick;
    object.tick = function() {
        if (this.queue.length > 0) {
            var currentQueue = this.queue[0];
            var result = currentQueue.event(currentQueue.duration);
            if (result !== true) {
                this.queue.shift();
            } else {
                currentQueue.duration = currentQueue.duration - 1;
                if (currentQueue.duration < 0) {
                    this.queue.shift();
                }
            }
        }
        storedTick && storedTick();
    }
}


var Entity = function() {
    this.actions = [];
}

var player = new Entity();
_.extend(player, {
    name: "You",
    friend: true,
    profile: profile1,
    img: linkImg,
    imgWalking: linkWalkingImg,
    imgBrawling: linkBrawlImg,
    imgPunching: linkBrawlPunchingImg,
    imgUnconscious: linkUnconsciousImg,
    dimensions: [0, 0, 33, 33]
})
tickable(player, function() {});
renderable(player);
selectable(player, function() { return true; });
walkable(player);
actionQueueAble(player);
brawlable(player, 3);
healthable(player, 1);

var medic = new Entity();
_.extend(medic, {
    name: "Medic",
    friend: true,
    profile: profile2,
    img: linkPurpleImg,
    imgWalking: linkPurpleWalkingImg,
    imgBrawling: linkBrawlImg,
    imgPunching: linkBrawlPunchingImg,
    imgUnconscious: linkUnconsciousImg,
    dimensions: [0, 0, 33, 33]
})
tickable(medic, function() {});
renderable(medic);
selectable(medic, function() { return true; });
walkable(medic);
actionQueueAble(medic);
brawlable(medic, 2);
healthable(medic, 20);

var alien = new Entity();
_.extend(alien, {
    name: "Alien",
    enemy: true,
    img: alienImg,
    imgBrawling: alienBrawlImg,
    imgPunching: alienBrawlPunchingImg,
    imgUnconscious: alienUnconsciousImg,
    dimensions: [0, 0, 33, 33]
})
renderable(alien);
actionQueueAble(alien);
brawlable(alien, 3);
brawlAI(alien);
selectable(alien, function() {
    return !!mousePressedPerson;
});
healthable(alien, 5);

var alien2 = new Entity();
_.extend(alien2, {
    name: "Alien2",
    enemy: true,
    img: alienImg,
    imgBrawling: alienBrawlImg,
    imgPunching: alienBrawlPunchingImg,
    imgUnconscious: alienUnconsciousImg,
    dimensions: [0, 0, 33, 33]
})
renderable(alien2);
actionQueueAble(alien2);
brawlable(alien2, 3);
brawlAI(alien2);
selectable(alien2, function() {
    return !!mousePressedPerson;
});
healthable(alien2, 20);

var GameObject = function(tick, visualTick, draw) {
    this.tick = tick || function() {};
    this.visualTick = visualTick || function() {};
    this.draw = draw || function() {};
}

var gameObjects = [];

// Ship
var Room = function(name, dimensions) {
    this.name = name;
    this.connections = [];
    this.entities = [];
    this.dimensions = dimensions;
    this.activated = 0;
    this.visualTick = function() {
        if (this.activated > 0) this.activated -= 1;
    }
    selectable(this, function() {
        var childrenHovered = _.filter(this.entities, function(entity) {
            return entity.hover;
        });
        return !!mousePressedPerson && childrenHovered.length === 0;
    });
}

var Door = function(from, to) {
    this.connections = [from, to];
};

var timesTwo = function(array) {
    return _.map(array, function(item) {
        return item * 2
    })
}

var bridge = new Room("Bridge", timesTwo([148, 114, 215, 96]));
var medbay = new Room("Medbay", timesTwo([368, 80, 112, 96]));
var storageroom = new Room("Storageroom", timesTwo([384, 181, 80, 73]));
var kitchen = new Room("Kitchen", timesTwo([32, 80, 112, 90]));
var engineroom = new Room("Engineroom", timesTwo([167, 37, 80, 73]));
var bedroom = new Room("Bedroom", timesTwo([48, 174, 80, 75]));
var shieldroom = new Room("Shieldroom", timesTwo([251, 37, 80, 73]));
var escapePod1 = new Room("Escape pod 1", timesTwo([66, 33, 43, 43]));
var escapePod2 = new Room("Escape pod 2", timesTwo([403, 34, 43, 43]));

bridge.entities.push(player);
bridge.entities.push(medic);

kitchen.entities.push(alien);
bedroom.entities.push(alien2);

var crew = [player, medic] //  , pilot, engineer, warrior];

var door1 = new Door(bedroom, kitchen);
var door2 = new Door(kitchen, bridge);
var door3 = new Door(engineroom, bridge);
var door4 = new Door(engineroom, shieldroom);
var door5 = new Door(bridge, medbay);
var door6 = new Door(medbay, storageroom);
var door7 = new Door(kitchen, escapePod1);
var door8 = new Door(medbay, escapePod2);

bridge.connections = [engineroom, kitchen, medbay];
medbay.connections = [escapePod2, storageroom, bridge];
storageroom.connections = [medbay];
kitchen.connections = [escapePod1, bridge, bedroom];
engineroom.connections = [shieldroom, bridge];
bedroom.connections = [kitchen];
shieldroom.connections = [engineroom];
escapePod1.connections = [kitchen];
escapePod2.connections = [medbay];

var rooms = [escapePod1, bedroom, kitchen, bridge, engineroom, shieldroom, medbay, storageroom, escapePod2];

_.each(rooms, function(room) {
    tickable(room, function() {
        _.each(this.entities, function(entity, idx) {
            entity.dimensions[0] = room.dimensions[0] + 40 + (45 * idx);
            entity.dimensions[1] = room.dimensions[1] + 40; 
        });
    });
})

var placeCrewRandomly = function() {
    _.each(crew, function(person) {
        var index = Math.floor(Math.random() * rooms.length);
        rooms[index].items.push(person);
    })
}

var doors = [door1, door2, door3, door4, door5, door6, door7, door8];

var ship = {
    rooms: rooms,
    doors: doors
}

/*var move = function(who, where) {
    var action = {
        name: "Move",
        shortName: "M",
        duration: (who.firemanCarry) ? 6 : 3,
        event: function(duration) {
            if (duration === 1) {
                var result = executeMove(who, where);

                if (who !== player) {
                    
                    var items = _.filter(where.items, function(item) {
                        return (item instanceof Alien || item instanceof Goo) && (item.hidden === false);
                    });
                    _.each(items, function(item) {    
                        who.addInformation(new Information(item.type, who, findPerson(who), item));
                    });
                }

                return result;
            }
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "Move scheduled";
}*/

var moveRoute = function(who, where) {
    /*var route = findRoute(findPerson(who), where);
    if (route) {
        route.shift();
        _.each(route, function(stop) {
            move(who, stop);
        });
        return "Route scheduled with " + (route.length - 1) + ' stops';
    } else {
        return "Route failed"
    }*/
}

/*var investigate = function(who) {
    if (!who) {
        console.log('Who?');
        return false;
    }
    if (who.firemanCarry) return who.name + " cannot investigate when carrying someone";

    var action = {
        name: "Investigate",
        shortName: "I",
        duration: 4,
        event: function(duration) {
            var room = findPerson(who);
            if (!room) {
                console.log('[[[ Cannot find ' + who.name + ' in any room ]]]');
                return false;
            } else if (duration === 0) {
                var foundItems = revealHiddenItemsInRoom(room);
                if (foundItems.length === 0) {
                    if (findPerson(player) === room) {
                        logIfApplicable(who.name + ': Investigation complete, nothing new found', findPerson(player));
                    } else {
                        who.iShouldReportThis = true;
                        who.addInformation(new Information(ROOM_CLEAR_STATUS, who, findPerson(who), ""));
                    }
                } else {
                    if (findPerson(player) === room) {
                        var items = '';
                        _.each(foundItems, function(item) {
                            items += item.name + ', ';
                        });
                        logIfApplicable(who.name + ' are done with investigation, found ' + items, findPerson(player));
                    } else {
                        _.each(foundItems, function(item) {
                            who.iShouldReportThis = true;
                            who.addInformation(new Information(item.type, who, findPerson(who), item));
                        })
                    }
                }
            }
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "Investigation added to queue";
}*/

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

// Ship help functions
var findDoor = function(from, to) {
    var door = _.filter(doors, function(door) {
        return _.contains(door.connections, from) && _.contains(door.connections, to);
    })
    return (door.length === 1) ? door[0] : alert("Door broken");
}

// Returns a room
var findInWhatRoom = function(whatOrWho) {
    var room = _.filter(rooms, function(room) {
        var list = _.filter(room.items, function(item) {
            return (item === whatOrWho);
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

var modifyAllDoorsStatus = function(status) {
    _.each(doors, function(door) {
        door.status = status;
    })
}

var findRoute = function(from, to) {
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
    return tryAllRooms(from);
}

var canBeHit = function(who) {
    return (who.conscious === true && who.hp > 1);
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
    return legal;
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

    context.drawImage(testImg, 0, 0);
    
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

    _.each(gameObjects, function(object) {
        object.draw();
    });
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
    gameTick();
}


var INTERVAL_DURATION = 1000/60;

var HALTED = true;
var DISABLE_VISUALTICK = false;
var DISABLE_RENDER = false;

var SCENARIO = false;

var DEBUG_SEED = false;

var canvas = document.getElementById('canvas');
var context = canvas.getContext("2d");

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
    /*var hits = detectHits(ship.rooms, e);
    _.each(ship.rooms, function(room) {
        room.hover = false;
    });
    if (hits[0] && hits[0].hoverCondition()) {
        hits[0].hover = true;
        return;
    }*/
});

document.addEventListener("mousedown", function(e) {
    /*if (e.button === 0) {
        var hits = detectHits(crew, e);
        
        if (hits.length > 0) {
            mousePressedPerson = hits[0];
        } else {
            mousePressedPerson = null;
        }
    } else if (e.button === 2) {
        if (mousePressedPerson) {
            var hits = detectHits(ship.rooms, e);

            if (hits[0]) {
                hits[0].activated = 60;
                moveRoute(mousePressedPerson, hits[0]);
            }
        }
    }*/
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

var GameObject = function(tick, visualTick, draw) {
    this.tick = tick || function() {};
    this.visualTick = visualTick || function() {};
    this.draw = draw || function() {};
}

/*var DamageTick = function(x, y, amount) {
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
}*/

// People
var Person = function(name, idx) {}
    /*this.dimensions = [0, 0, 33, 33];
    this.name = name;
    this.hp = 5;
    this.idx = idx;
    this.queue = [];
    this.markedForRemoval = false;
    this.iShouldReportThis = false;
    this.information = [];
    this.conscious = true;
    this.inventory = [];
    this.firemanCarry = null;
    this.draw = function() {
        var img;
        if (this.conscious) {
            img = linkImg;
            if (isBrawling(this)) img = linkBrawlImg;
        } else {
            img = linkUnconsiousImg;
        }
        context.drawImage(img, this.dimensions[0], this.dimensions[1]);
        context.fillStyle = "black";
        context.fillText(this.name, this.dimensions[0], this.dimensions[1]-2);
    },
    this.iJustSawGooRemoved = function(goo) {
        this.iShouldReportThis = true;
        this.addInformation(new Information(GOO_REMOVED_STATUS, this, findPerson(this), goo));
    };
    this.hurt = function(what) {
        if (what instanceof Alien) {
            if (this.firemanCarry) {
                this.hp = this.hp - 3;
                gameObjects.push(new DamageTick(this.dimensions[0], this.dimensions[1], -3));
                return 3;
            } else {
                gameObjects.push(new DamageTick(this.dimensions[0], this.dimensions[1], -1));
                this.hp = this.hp - 1;
                return 1;
            }
        }
    }
    this.addInformation = function(inputInfo) {
        if (findPerson(this) !== findPerson(player) && this.conscious) {
            this.information = addInformation.call(null, this.information, inputInfo);
        }
    };
    this.foundAlien = function(alien) {
        if (findPerson(this) !== findPerson(player)) {
            this.iShouldReportThis = true;
        }
        this.addInformation(new Information(ALIEN_STATUS, this, findPerson(this), alien));
    };

    this.defeatedAlien = function(alien) {
        this.addInformation(new Information(ALIEN_DEFEATED_STATUS, this, findPerson(this), alien));
    }

    this.tick = function() {
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
    }

    makeFocusable(this, function() {
        return this.conscious;
    })
}*/

var mixinAI = function(person) {
    var preserve = person.tick;
    person.goUnconscious = function() {
        this.queue = [];
        this.conscious = false;
        logIfApplicable(this.name + " is unconscious", findPerson(this))
    }
    person.tick = function() {
        if (this.hp === 1 && this.conscious === true) {
            this.goUnconscious();
            return;
        }
        if (!this.conscious) return;

        if (this.name === 'Pilot' && findPerson(this) === bridge) {
            this.information = addInformation(this.information, new Information(ENGINE_STATUS, this, findPerson(this), engine.status));
            this.information = addInformation(this.information, new Information(HULL_STATUS, this, findPerson(this), controlPanel.breachDetected));
        }

        var aliens = _.filter(findPerson(this).items, function(item) {
           return item.type === "Alien"; 
        });
        if (aliens.length > 0) {
            _.each(aliens, function(alien) {
                this.foundAlien(alien);
            }.bind(this));
            if (this.queue.length === 0) {
                brawl(this, aliens[0]);
            }
        } else {
            if (this.iShouldReportThis) {
                this.iShouldReportThis = false;
                report(this, isAnyInformationCritical(this.information));
            }
        }
        preserve.call(person);
    }
}

var mixinPlayer = function(player) {
    var preserve = player.tick;
    player.tick = function() {
        if (this.hp === 1) {
            this.conscious = false;
            console.log("*** GAME OVER, YOU ARE DEAD");
        }
        _.each(information, function(info) {
            if (info.room === findPerson(this)) {
                info.markedForRemoval = true;
            }
        }.bind(this))
        preserve.call(player);
    }
}

var makeFocusable = function(object, condition) {
    object.hover = false;
    object.hoverCondition = condition;
}

/*var player = new Person("You", 0);
mixinPlayer(player);
player.inventory.push(new FirstAidKit());

var medic = new Person("Medic", 1);
mixinAI(medic);
medic.inventory.push(new FirstAidKit());

var engineer = new Person("Engineer", 2);
mixinAI(engineer);

var warrior = new Person("Warrior", 3);
mixinAI(warrior);

var pilot = new Person("Pilot", 4);
mixinAI(pilot);*/

// Ship
var Room = function(name, dimensions) {
    this.name = name;
    this.connections = [];
    this.items = [];
    this.dimensions = dimensions;
    this.activated = 0;
    this.visualTick = function() {
        if (this.activated > 0) this.activated -= 1;
    }
    makeFocusable(this, function() {
        return !!mousePressedPerson;
    });
}

var Door = function(from, to) {
    this.connections = [from, to];
};

/*var alienCounter = 0;
var Alien = function() {
    this.dimensions = [0, 0, 33, 33];
    this.name = "Alien" + alienCounter;
    alienCounter++;
    this.hp = 30;
    this.hidden = false;
    this.type = ALIEN_STATUS;
    this.markedForRemoval = false;
    this.action = null,
    this.draw = function() {
        var img = alienImg;
        if (this.action && this.action.name === "Brawl") img = alienBrawlImg;
        context.drawImage(img, this.dimensions[0], this.dimensions[1]);
        context.fillStyle = "black";
        context.fillText(this.name, this.dimensions[0], this.dimensions[1]-1);
    },
    this.tick = function() {
        if (this.hp <= 0) {
            this.markedForRemoval = true;
        } else {
            if (this.action) {
                this.action.event(this);
                return;
            }
            if (findItem(this).crew.length === 0) return;

            var alienRoom = findItem(this);

            var amountBrawling = _.filter(findItem(this).crew, function(person) {
                return (isBrawling(person, this));
            }.bind(this));


            var eligble = _.filter(findItem(this).crew, function(person) {
                return canBeHit(person);
            });

            if (eligble.length < 1) {
                return;
            }
            this.action = {
                target: null,
                name: "Brawl",
                idx: 180,
                event: function(parent) {
                    if (!(this.target && this.target.conscious && findItem(parent) === findPerson(this.target))) {
                        parent.action = null;
                        return;
                    }
                    if (this.idx < 0) {
                        this.target.hurt(parent)
                        this.idx = 180
                    } else {
                        this.idx -= 1;
                    }
                }
            }
            if (amountBrawling.length === 0) {
                var randomidx = Math.floor(Math.random() * eligble.length)
                this.action.target = eligble[randomidx];
            } else if (amountBrawling.length === 1) {
                this.action.target = amountBrawling[0];
            } else {
                var randomidx = Math.floor(Math.random() * amountBrawling.length)
                this.action.target = amountBrawling[randomidx];                
            }
        }
    }
}*/

var timesTwo = function(array) {
    return _.map(array, function(item) {
        return item * 2
    })
}

var gameObjects = [];

var bridge = new Room("Bridge      ", timesTwo([148, 114, 215, 96]));
var medbay = new Room("Medbay      ", timesTwo([368, 80, 112, 96]));
var storageroom = new Room("Storageroom ", timesTwo([384, 181, 80, 73]));
var kitchen = new Room("Kitchen     ", timesTwo([32, 80, 112, 90]));
var engineroom = new Room("Engineroom  ", timesTwo([167, 37, 80, 73]));
var bedroom = new Room("Bedroom     ", timesTwo([48, 174, 80, 75]));
var shieldroom = new Room("Shieldroom  ", timesTwo([251, 37, 80, 73]));
var escapePod1 = new Room("Escape pod 1", timesTwo([66, 33, 43, 43]));
var escapePod2 = new Room("Escape pod 2", timesTwo([403, 34, 43, 43]));

//var crew = [player, medic, pilot, engineer, warrior];

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
    var route = findRoute(findPerson(who), where);
    if (route) {
        route.shift();
        _.each(route, function(stop) {
            move(who, stop);
        });
        return "Route scheduled with " + (route.length - 1) + ' stops';
    } else {
        return "Route failed"
    }
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
        _.each(room.crew, function(person) {
            if (who === person) {
                if (!_.contains(room.connections, where)) {
                    console.log('[[[ ' + who.name + ' tried illegal move ]]]');
                    legal = false;
                } else {
                    var relevantDoor = findDoor(room, where);
                    if (relevantDoor.status === LOCKED) {
                        console.log('[[[ ' + who.name + ' finds door locked ]]]');
                        legal = false;
                    }
                }
            }
        })
    });
    return legal;
}

var executeMove = function(who, where) {
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
        room.items = _.filter(room.items, function(person) {
            return !(who === person);
        })
    })

    where.items.push(who);
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
        _.each(room.items, function(item) {
            item.tick && item.tick();
        });
    });

    //Remove items
    _.each(rooms, function(room) {
        room.items = _.filter(room.items, function(item) {
            return !(item.markedForRemoval === true);
        });
    });
}

var testImg = new Image();
testImg.src = "test.png";

var render = function() {
    context.fillStyle = "gray";
    context.fillRect(0,0, 1024, 768);
    context.font = "12px Arial";

    context.drawImage(testImg, 0, 0);
    
    _.chain(rooms)
        .filter(function(room) {
            return (room.dimensions);
        })
        .each(function(room) {
            context.beginPath();
            var color = "#ccc";
            if (room.activated > 0) {
                color = "#0f0";
            } else if (room.hover) {
                color = "#00f";
            }
            context.strokeStyle = color;
            context.rect.apply(context, room.dimensions);
            context.stroke();

            _.each(room.items, function(item, idx) {
                item.dimensions[0] = room.dimensions[0] + 40 + (45 * idx);
                item.dimensions[1] = room.dimensions[1] + 40;

                item.draw();
                if (item === mousePressedPerson) {
                    context.beginPath();
                    context.strokeStyle = "#f00";
                    context.rect(item.dimensions[0], item.dimensions[1], 33, 33);
                    context.stroke();
                }
            })
        });

    if (mousePressedPerson) {
        context.fillStyle = "black";
        context.font = "12px Arial";
        context.fillText("Queue:", 80, 540);
        _.each(mousePressedPerson.queue, function(item, idx) {
            context.fillText(item.name, 80 + (idx * 120), 560);
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
}

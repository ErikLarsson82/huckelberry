//TODO
// - Order via telecom om uppe
// - Pilot ger orderstatus på motor och hull breach
// - Dela upp filen, requireJS

var TICK_DURATION = 2000;
var HALTED = true;

var OPERATIONAL = "Operational";
var BROKEN = "Broken";
var LOCKED = "Locked";
var UNLOCKED = "Unlocked";
var LOCATION_STATUS = "Location";
var ENGINE_STATUS = "Engine";
var DOOR_STATUS = "Door";
var HULL_STATUS = "Hull";
var ALIEN_STATUS = "Alien";
var GOO_STATUS = "Goo";
var ROOM_CLEAR_STATUS = "Room clear";

var DEBUG_SHOW_TRUE_VALUES = false;
var DEBUG_SHOW_HIDDEN_ITEMS = false;
var DEBUG_SHOW_ALL_ITEMS = false;
var DEBUG_SHOW_ALL_CREW = false;
var DEBUG_SEED = 3375;

var BREAK_ENGINE_ON_STARTUP = false;
var GOO_IN_STORAGEROOM = false;
var GOO_IN_RANDOM_ROOM = true;
var ALIEN_IN_BEDROOM = true;
var LOCK_ALL_DOORS = false;

document.addEventListener("keydown", function(e) {
    if (e.code === "Space") {
        if (HALTED) {
            HALTED = false;
            console.log("Simulation resumed");
        } else {
            HALTED = true;
            console.log("Simulation paused!");
        }   
    } else if (e.keyCode === 83) {
        if (!HALTED) {
            console.log("Simulation paused!");
        }
        HALTED = true;
        console.log("");
        console.log("");
        console.log("");
        printShipStatus();
    } else if (e.keyCode === 84) {
        if (!HALTED) {
            console.log("Simulation paused!");
        }
        HALTED = true;
        console.log("Manual tick");
        gameTick();
    }
});

// Information
var Information = function(type, who, where, value) {
    this.type = type;
    this.person = who;
    this.room = where;
    this.value = value;
}

// People 
var Person = function(name, idx) {
    this.name = name;
    this.idx = idx;
    this.queue = [];

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
}

var player = new Person("You", 0);

var medic = new Person("Medic", 1);

var mechanic = new Person("Mechanic", 2);

var mercenary = new Person("Mercenary", 3);

var pilot = new Person("Pilot", 4);

// Ship
var Room = function(name) {
    this.name = name;
    this.connections = [];
    this.crew = [];
    this.items = [];
}

var Engine = function() {
    this.status = OPERATIONAL;
};

var ControlPanel = function() {
    this.actions = [modifyAllDoorsStatus];
    this.breachDetected = false;
};

var Door = function(from, to) {
    this.status = UNLOCKED;
    this.connections = [from, to];
};

var Goo = function() {
    this.name = 'Goo';
    this.hp = 4;
    this.hidden = true;
    this.activationTime = 6;
    this.type = GOO_STATUS;
    this.tick = function() {
        var room = findRoomByItemInstance(this);
        if (countAliensInRoom(room).length < 1) {
            this.activationTime = this.activationTime - 1;
            if (this.activationTime <= 0) {
                var currentRoom = room;
                var spawningAlien = new Alien();
                currentRoom.items.push(spawningAlien);
                this.activationTime = 5;

                if (DEBUG_SHOW_HIDDEN_ITEMS || room.crew.length > 0) {
                    var you = _.filter(room.crew, function(person) {
                        return person.name === "You";
                    });
                    if (you.length > 0) {
                        console.log('*** Alien lifeform spawned ***');
                    } else {
                        var others = _.filter(room.crew, function(person) {
                            return person.name !== "You";
                        });
                        if (others.length > 0 && this.hidden === false) {
                            information.push(new Information(ALIEN_STATUS, others[0], findPerson(others[0]), spawningAlien.name));
                            console.log('*** ' + others[0].name + ' ive found an Alien ***');
                            // Start brawl!?
                        }
                    }
                }
            }
        }
    }
}

var alienCounter = 0;
var Alien = function() {
    this.name = "Alien" + alienCounter;
    alienCounter++;
    this.hp = 2;
    this.hidden = false;
    this.type = ALIEN_STATUS;
}

var bridge = new Room("Bridge      ");
var medbay = new Room("Medbay      ");
var storageroom = new Room("Storageroom ");
var kitchen = new Room("Kitchen     ");
var engineroom = new Room("Engineroom  ");
var bedroom = new Room("Bedroom     ");
var shieldroom = new Room("Shieldroom  ");
var escapePod1 = new Room("Escape pod 1");
var escapePod2 = new Room("Escape pod 2");

var crew = [player, medic]; //, mechanic, mercenary, pilot];

var information = [];

var engine = new Engine();

var controlPanel = new ControlPanel();

var door1 = new Door(bedroom, kitchen);
var door2 = new Door(kitchen, bridge);
var door3 = new Door(engineroom, bridge);
var door4 = new Door(engineroom, shieldroom);
var door5 = new Door(bridge, medbay);
var door6 = new Door(medbay, storageroom);
var door7 = new Door(kitchen, escapePod1);
var door8 = new Door(medbay, escapePod2);

medbay.crew = [];
bridge.crew = [player, medic];
kitchen.crew = [];
bedroom.crew = [];
storageroom.crew = [];
engineroom.crew = [];

bridge.items.push(controlPanel);
engineroom.items.push(engine);

bridge.connections = [engineroom, kitchen, medbay];
medbay.connections = [escapePod2, storageroom, bridge];
storageroom.connections = [medbay];
kitchen.connections = [escapePod1, bridge, bedroom];
engineroom.connections = [shieldroom, bridge];
bedroom.connections = [kitchen];
shieldroom.connections = [engineroom];
escapePod1.connections = [kitchen];
escapePod2.connections = [medbay];

var rooms = [bridge, medbay, storageroom, kitchen, engineroom, bedroom, escapePod1, escapePod2];

var doors = [door1, door2, door3, door4, door5, door6, door7, door8];
var ship = {
    rooms: rooms,
    doors: doors,
    crew: crew
}

// Item functions
var lockAllDoors = function(who) {
    var action = {
        name: "Lock all doors",
        shortName: "LA",
        duration: 1,
        event: function(duration) {
            var eligablePerson = _.filter(bridge.crew, function(person) {
                return (person === who);
            });
            if (eligablePerson.length === 0) {
                console.log('[[[ ' + who.name + ' not eligable for door lock ]]]');
                return false;
            } else if (duration === 0) {
                console.log('*** Doors locked ***');
                modifyAllDoorsStatus(LOCKED);
            }
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "Lock all doors scheduled";
}

var unlockAllDoors = function(who) {
    var action = {
        name: "Unlock all doors",
        shortName: "UA",
        duration: 1,
        event: function(duration) {
            var eligablePerson = _.filter(bridge.crew, function(person) {
                return (person === who);
            });
            if (eligablePerson.length === 0) {
                console.log('[[[ ' + who.name + ' not eligable for door unlock ]]]');
                return false;
            } else if (duration === 0) {
                console.log('*** Doors unlocked ***');
                modifyAllDoorsStatus(UNLOCKED);
            }
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "Unlock all doors scheduled";
}

var fixEngine = function(who) {
    var action = {
        name: "Repair",
        shortName: "R",
        duration: 2,
        event: function(duration) {
            var eligablePerson = _.filter(engineroom.crew, function(person) {
                return (person === who);
            });
            if (eligablePerson.length === 0) {
                console.log('[[[ ' + who.name + ' not eligable for engine repair ]]]');
                return false;
            } else if (duration === 0) {
                console.log("*** Engine repaired ***");
                engine.status = OPERATIONAL;
            }
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "Repair added to queue";
}

// People functions
var searchTheShip = function() {
    _.each(crew, function(person) {
        investigate(person);
    })
}

var reportAll = function() {
    _.chain(crew).filter(function(person) { return !(person.name === "You") }).each(function(person) { report(person) });
}

var report = function(who) {
    if (who.name === "You") return;
    var action = {
        name: "Report",
        shortName: "R",
        duration: 1,
        event: function(duration) {
            if (duration === 0) {
                information.push(new Information(LOCATION_STATUS, who, findPerson(who)));
                var log = '*** ' + who.name + ': Im at ' + findPerson(who).name;
                if (findPerson(who) === bridge && who.name === "Pilot") {
                    information.push(new Information(ENGINE_STATUS, who, findPerson(who), engine.status));
                    information.push(new Information(HULL_STATUS, who, findPerson(who), controlPanel.breachDetected));
                    log += ', also reporting ship data';
                }
                log += ' ***';
                console.log(log);
            }
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "Report scheduled";
}

var move = function(who, where) {
    var action = {
        name: "Move",
        shortName: "M",
        duration: 4,
        event: function(duration) {
            if (duration === 2) {
                var result = executeMove(who, where);

                var others = _.filter(where.crew, function(person) {
                    return person.name !== "You" && _.filter(where.items, function(item) {
                        return item instanceof Alien;
                    })[0];
                });
                if (others.length > 0) {
                    _.each(where.items, function(item) {
                        if (item.hidden === true) return;
                        information.push(new Information(ALIEN_STATUS, others[0], findPerson(others[0]), item.name));
                        information.push(new Information(LOCATION_STATUS, others[0], findPerson(others[0])));
                        console.log('*** ' + others[0].name + ' ive found an ' + item.name + ' ***');
                    });
                }

                return result;
            }
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "Move scheduled";
}

var investigate = function(who) {
    if (!who) {
        console.log('Who?');
        return false;
    }
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
                        console.log('*** ' + who.name + ': Investigation complete, nothing new found ***');
                    } else {
                        information.push(new Information(LOCATION_STATUS, who, findPerson(who)));
                        console.log('*** ' + who.name + ': Investigation complete at ' + findPerson(who).name + ', nothing new ***');
                        if (room.items.length === 0) {
                            information.push(new Information(ROOM_CLEAR_STATUS, who, findPerson(who)));
                        }
                    }
                } else {
                    if (findPerson(player) === room) {
                        var items = '';
                        _.each(foundItems, function(item) {
                            items += item.name + ', ';
                        });
                        console.log('*** ' + who.name + ' are done with investigation, found ' + items + ' ***');
                    } else {
                        information.push(new Information(LOCATION_STATUS, who, findPerson(who)));
                        _.each(foundItems, function(item) {
                            console.log('*** ' + who.name + ': Investigation complete, found ' + item.name + ' ***');
                            information.push(new Information(item.type, who, findPerson(who)));
                        });
                    }
                }
            }
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "Investigation added to queue";
}

var removeQueuedAction = function(who) {
    who.queue.shift();
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

var findPerson = function(who) {
    var room = _.filter(rooms, function(room) {
        var list = _.filter(room.crew, function(person) {
            return (person === who);
        });
        return list.length > 0;
    });
    return (room.length > 0) ? room[0] : false;
}

var findItemByInstanceOf = function(what) {
    var items = [];
    _.each(rooms, function(room) {
        var list = _.filter(room.items, function(item) {
            return (item instanceof what);
        });
        items = items.concat(list);
    });
    return (items.length > 0) ? items : false;
}

var findRoomByItemInstance = function(what) {
    var room = _.filter(rooms, function(room) {
        var list = _.filter(room.items, function(item) {
            return (item === what);
        });
        return list.length > 0;
    });
    return (room.length > 0) ? room[0] : false;
}


var modifyAllDoorsStatus = function(status) {
    _.each(doors, function(door) {
        door.status = status;
    })
}

// Help functions
var revealHiddenItemsInRoom = function(room) {
    var items = _.filter(room.items, function(item) {
        return (item.hidden === true);
    });
    _.each(items, function(item) {
        item.hidden = false;
    });
    return items;
}

var countAliensInRoom = function(room) {
    return _.filter(room.items, function(item) {
        return (item instanceof Alien);
    });
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
        room.crew = _.filter(room.crew, function(person) {
            return !(who === person);
        })
    })

    where.crew.push(who);

    return true;
}

var printShipStatus = function() {
    console.log("   Room status:");
    _.each(rooms, function(room) {
        var prettyPeople = "";
        if (DEBUG_SHOW_ALL_CREW || findPerson(player) === room) {
            _.each(room.crew, function(person) {
                var prettyPerson = person.name;
                if (person.queue.length > 0) {
                    prettyPerson += "[" + person.queue[0].shortName + "-" + person.queue[0].duration + "]";
                }
                prettyPeople += prettyPerson + ", ";
            });
        } else {

            var applicableInfo = _.filter(information, function(info) {
                return info.room === room && info.type === LOCATION_STATUS;
            });
            if (applicableInfo.length > 0) {
                _.each(applicableInfo, function(info) {
                    prettyPeople += '(' + info.person.name + '), ';
                });
            } else {
                prettyPeople = "-";
            }
        }
        var roomclear = _.filter(information, function(info) {
            return info.type === ROOM_CLEAR_STATUS && info.room === room;
        });
        var roomclearOutput = (roomclear[0]) ? "[C] " : "";
        console.log("          " + room.name + ": " + roomclearOutput + prettyPeople);
        var items = _.filter(room.items, function(item) {
            if (DEBUG_SHOW_HIDDEN_ITEMS && item.hidden === true) {
                return true;
            } else {
                return (item.hidden === false);
            }
        });
        if (findPerson(player) === room || DEBUG_SHOW_ALL_ITEMS) {
            if (items.length > 0) {
                var prettyItems = '';
                _.each(items, function(item) {
                    prettyItems += item.name + ', '
                });
                console.log('                        { ' + prettyItems + ' }');
            }
        } else {
            var applicableInfo = _.filter(information, function(info) {
                return ((info.type === ALIEN_STATUS) || (info.type === GOO_STATUS)) && room === info.room;
            });
            if (applicableInfo.length > 0) {
                var log = '                        { ';
                _.each(applicableInfo, function(info) {
                    log += info.person.name + '(' + ((info.type === GOO_STATUS) ? info.type : info.value) + '), ';
                })
                console.log(log + '}');
            }
        }
    });
    console.log("   Ship status:");

    var applicableInfo = _.filter(information, function(info) {
        return info.type === ENGINE_STATUS;
    });
    if (applicableInfo.length > 0) {
        console.log('          Engine      : (' + applicableInfo[0].value + ')');
    } else {
        console.log("          Engine      : -");
    }
    if (DEBUG_SHOW_TRUE_VALUES) console.log("          Engine      : " + engine.status);

    var doorStatus = "          Doors       : ";
    _.each(doors, function(door) {
        doorStatus += (door.status === LOCKED) ? "L, " : "U, ";
    })
    console.log(doorStatus);

    var applicableInfo = _.filter(information, function(info) {
        return info.type === HULL_STATUS;
    });
    if (applicableInfo.length > 0) {
        console.log('          Hull breach : (' + applicableInfo[0].value + ')');
    } else {
        console.log("          Hull breach : -");
    }
    if (DEBUG_SHOW_TRUE_VALUES) console.log("          Hull breach : " + controlPanel.breachDetected);
}

var gameTick = function() {
    console.log("");
    console.log("");
    console.log("New turn:");

    _.each(ship.crew, function(person) {
        person.tick();
    });

    _.each(rooms, function(room) {
        _.each(room.items, function(item) {
            item.tick && item.tick();
        });
    });
    printShipStatus();
}

// Setup seed

var randomSeed = Math.round(Math.random() * 10000);
var seed = (DEBUG_SEED) ? DEBUG_SEED : randomSeed;
console.log("Using seed " + seed);
Math.seedrandom(seed);

// Temp start conditions
if (BREAK_ENGINE_ON_STARTUP) {
    engine.status = BROKEN;
}
if (GOO_IN_STORAGEROOM) {
    controlPanel.breachDetected = true;
    storageroom.items.push(new Goo());
}
if (GOO_IN_RANDOM_ROOM) {
    var countRooms = rooms.length;
    var randomIndex = Math.floor(Math.random() * countRooms);
    controlPanel.breachDetected = true;
    rooms[randomIndex].items.push(new Goo());
}
if (LOCK_ALL_DOORS) {
    modifyAllDoorsStatus(LOCKED);
}
if (ALIEN_IN_BEDROOM) {
    var spawningAlien = new Alien();
    bedroom.items.push(spawningAlien);
}

var spawningAlien = new Alien();
kitchen.items.push(spawningAlien);
var spawningAlien = new Alien();
kitchen.items.push(spawningAlien);

// Start game
printShipStatus();

setInterval(function() {
    if (HALTED) return;
    gameTick();
}, TICK_DURATION);
//TODO
// - Order via telecom om uppe
// - Pilot ger orderstatus på motor och sköld
// - Undersöka varje rum
// - Rum-events, exempelvis motorfel
// - Dela upp filen, requirejs

var TICK_DURATION = 2000;
var HALTED = true;

var OPERATIONAL = "Operational";
var BROKEN = "Broken";
var LOCKED = "Locked";
var UNLOCKED = "Unlocked";

var BREAK_ENGINE_ON_STARTUP = true;
var GOO_IN_STORAGEROOM = true;

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

// People 
var Person = function(name) {
    this.name = name;
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
var player = new Person("You");

var medic = new Person("Medic");

var mechanic = new Person("Mechanic");

var mercenary = new Person("Mercenary");

var pilot = new Person("Pilot");

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
};

var Door = function(from, to) {
    this.status = LOCKED;
    this.connections = [from, to];
};

var Goo = function() {
    this.name = "Goo";
    this.hp = 20;
    this.hidden = true;
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

var crew = [player, medic, mechanic, mercenary, pilot];

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

bridge.crew = [player, medic, pilot];
storageroom.crew = [mercenary];
engineroom.crew = [mechanic];

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

var ship = {
    rooms: [bridge, medbay, storageroom, kitchen, engineroom, bedroom, escapePod1, escapePod2],
    doors: [door1, door2, door3, door4, door5, door6, door7, door8],
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
                var foundItems = markHiddenItemsInRoom(room);
                if (foundItems === 0) {
                    console.log('*** Investigation complete, no items found ***');
                } else {
                    var items = '';
                    _.each(foundItems, function(item) {
                        items += item.name + ', ';
                    });
                    console.log('*** Investigation complete, found ' + items + ' ***');
                }
                engine.status = OPERATIONAL;
            }
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "Investigation added to queue";
}

// People functions
var move = function(who, where) {
    var action = {
        name: "Move",
        shortName: "M",
        duration: 4,
        event: function(duration) {
            if (duration === 2) {
                var result = executeMove(who, where);
                if (result) who.name + " moved to " + where.name;
                return result;
            }
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "Move scheduled";
}

// Ship help functions
var findDoor = function(from, to) {
    var door = _.filter(ship.doors, function(door) {
        return _.contains(door.connections, from) && _.contains(door.connections, to);
    })
    return (door.length === 1) ? door[0] : alert("Door broken");
}

var findPerson = function(who) {
    var room = _.filter(ship.rooms, function(room) {
        var list = _.filter(room.crew, function(person) {
            return (person === who);
        });
        return list.length > 0;
    });
    return (room.length > 0) ? room[0] : false;
}

var modifyAllDoorsStatus = function(status) {
    _.each(ship.doors, function(door) {
        door.status = status;
    })
}

// Help functions
var markHiddenItemsInRoom = function(room) {
    var items = _.filter(room.items, function(item) {
        return (item.hidden === true);
    });
    _.each(room.items, function(item) {
        item.hidden === false;
    });
    return items;
}

var isLegalMove = function(who, where) {
    var legal = true;
    _.each(ship.rooms, function(room) {
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

    ship.rooms =_.each(ship.rooms, function(room) {
        room.crew = _.filter(room.crew, function(person) {
            return !(who === person);
        })
    })

    where.crew.push(who);

    return true;
}

var printShipStatus = function() {
    console.log("   Room status:");
    _.each(ship.rooms, function(room) {
        var prettyPeople = "";
        if (room.crew) {
            for (var j = 0; j < room.crew.length; j++) {
                var person = room.crew[j];
                var prettyPerson = person.name;
                if (person.queue.length > 0) {
                    prettyPerson += "[" + person.queue[0].shortName + "-" + person.queue[0].duration + "]";
                }
                prettyPeople += prettyPerson + ", ";
            }
        } else {
            prettyPeople = "-";
        }
        console.log("          " + room.name + ": " + prettyPeople);
    });
    console.log("   Ship status:");
    console.log("          Engine      : " + engine.status);
    var doorStatus = "          Doors       : ";
    _.each(ship.doors, function(door) {
        doorStatus += (door.status === LOCKED) ? "L, " : "U, ";
    })
    console.log(doorStatus);

}

var gameTick = function() {
    console.log("");
    console.log("");
    console.log("New turn:");

    _.each(ship.crew, function(person) {
        person.tick();
    })
    printShipStatus();
}

// Temp start conditions
if (BREAK_ENGINE_ON_STARTUP) {
    engine.status = BROKEN;
}
if (GOO_IN_STORAGEROOM) {
    storageroom.items.push(new Goo());
}

// Start game
printShipStatus();

setInterval(function() {
    if (HALTED) return;
    gameTick();
}, TICK_DURATION);
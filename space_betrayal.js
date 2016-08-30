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
            currentQueue.event(currentQueue.duration);
            currentQueue.duration = currentQueue.duration - 1;
            if (currentQueue.duration < 0) {
                this.queue.shift();
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

bridge.crew = [player, medic, mercenary, pilot];
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
            } else if (duration === 0) {
                console.log('*** Doors locked ***');
                modifyAllDoorsStatus(LOCKED);
            }
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
            } else if (duration === 0) {
                console.log('*** Doors unlocked ***');
                modifyAllDoorsStatus(UNLOCKED);
            }
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
            } else if (duration === 0) {
                console.log("*** Engine repaired ***");
                engine.status = OPERATIONAL;
            }
        }.bind(who)
    }
    who.queue.push(action);
    return "Repair added to queue";
}

// People functions
var move = function(who, where) {
    var action = {
        name: "Move",
        shortName: "M",
        duration: 4,
        event: function(duration) {
            if (duration === 2) {
                executeMove(who, where);
            }
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

var modifyAllDoorsStatus = function(status) {
    _.each(ship.doors, function(door) {
        door.status = status;
    })
}

// Help functions
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
        return;
    }
    if (!where) {
        console.log('Where?');
        return;
    }
    var islegal = isLegalMove(who, where)
    if (!islegal) return;

    ship.rooms =_.each(ship.rooms, function(room) {
        room.crew = _.filter(room.crew, function(person) {
            return !(who === person);
        })
    })

    where.crew.push(who);

    return who.name + " moved to " + where.name;
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


// Start game
if (BREAK_ENGINE_ON_STARTUP) {
    engine.status = BROKEN;
}

printShipStatus();

setInterval(function() {
    if (HALTED) return;
    gameTick();
}, TICK_DURATION);
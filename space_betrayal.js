var TICK_DURATION = 2000;
var HALTED = false;

var OPERATIONAL = "Operational";
var BROKEN = "Broken";

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
    }
});

//---- People 
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

// ------ Ship
var Room = function(name) {
    this.name = name;
    this.connections = [];
    this.crew = [];
    this.items = [];
}

var Engine = function() {
    this.status = OPERATIONAL;
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

var crew = [player, medic, mechanic, mercenary];

var engine = new Engine();

bridge.crew = [player, medic, mercenary];

engineroom.crew = [mechanic];

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
    crew: crew
}

// People functions
var move = function(who, where) {
    isLegalMove(who, where);
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

var isLegalMove = function(who, where) {
    var legal = true;
    _.each(ship.rooms, function(room) {
        _.each(room.crew, function(person) {
            if (who === person && !_.contains(room.connections, where)) {
                console.log('[[[ Illegal move ]]]');
                legal = false;
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
                console.log('[[[ Not eligable ]]]');
            } else {
                if (duration === 0) {
                    console.log("*** Engine repaired ***");
                    engine.status = OPERATIONAL;
                }
            }
        }.bind(who)
    }
    who.queue.push(action);
    return "Repair added to queue";
}

// ---- Help functions
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
}


// Start game
if (BREAK_ENGINE_ON_STARTUP) {
    engine.status = BROKEN;
}

printShipStatus();

setInterval(function() {
    if (HALTED) return;

    console.log("");
    console.log("");
    console.log("New turn:");

    _.each(ship.crew, function(person) {
        person.tick();
    })
    printShipStatus();
}, TICK_DURATION);
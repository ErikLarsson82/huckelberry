//---- People 
var Person = function(name) {
    this.name = name;
}
var player = new Person("You");

var medic = new Person("Medic");

var mechanic = new Person("Mechanic");

var mercenary = new Person("Mercenary");

// ------ Ship
var Room = function(name) {
    this.name = name;
    this.connections = [];
    this.people = [];
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

bridge.people = [player, medic, mechanic, mercenary];

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
    rooms: [bridge, medbay, storageroom, kitchen, engineroom, bedroom, escapePod1, escapePod2]
}

// Movement functions
var move = function(who, where) {
    if (!who) {
        console.log('Who?');
        return;
    }
    if (!where) {
        console.log('Where?');
        return;
    }
    var illegal = false;
    _.each(ship.rooms, function(room) {
        _.each(room.people, function(person) {
            if (who === person && !_.contains(room.connections, where)) {
                console.log('Illegal move');
                illegal = true;
            }
        })
    });
    if (illegal) return;

    ship.rooms =_.each(ship.rooms, function(room) {
        room.people = _.filter(room.people, function(person) {
            return !(who === person);
        })
    })

    where.people.push(who);

    return who.name + " moved to " + where.name;
}

// ---- Help functions
var printShipStatus = function() {
    console.log("-------- Ship status --------");
    for (var i = 0; i < ship.rooms.length; i++) {
        var currentRoom = ship.rooms[i];
        var prettyPeople = "";
        if (currentRoom.people) {
            for (var j = 0; j < currentRoom.people.length; j++) {
                prettyPeople += currentRoom.people[j].name + ", ";
            }
        } else {
            prettyPeople = "-";
        }
        console.log(currentRoom.name + ": " + prettyPeople);
    }
}

printShipStatus();
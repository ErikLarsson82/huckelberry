//TODO
// - Order via telecom om uppe
// - Starta random platser
// - Move chaincommand
// - searchrepeat
// - goo + alien kan spawna
// - seal goo breach med verktyg
// - syrenivåer
// - få mindre HP av brawl med aliens
// - kan bli medvetslös
// - medvetslös -> vaken av luktsalt
// - Dela upp filen, requireJS

// Sub tasks information
// - Hantera conflicting info ??
// - Investigation ska rapportera aliens också, men inte om hen brawlar

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
var ALIEN_DEFEATED_STATUS = "Alien defeated";
var GOO_STATUS = "Goo";
var ROOM_CLEAR_STATUS = "Room clear";

var DEBUG_SHOW_TRUE_VALUES = false;
var DEBUG_SHOW_HIDDEN_ITEMS = false;
var DEBUG_SHOW_ALL_ITEMS = false;
var DEBUG_SHOW_ALL_CREW = false;
var DEBUG_SHOW_HIDDEN_LOGS = true;
var DEBUG_SEED = 2741;

var BREAK_ENGINE_ON_STARTUP = false;
var GOO_IN_STORAGEROOM = false;
var GOO_IN_RANDOM_ROOM = false;
var ALIEN_IN_BEDROOM = false;
var TWO_ALIENS_IN_KITCHEN = false;
var LOCK_ALL_DOORS = false;

var SCENARIO = 9;

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
    this.decay = 0;
    this.seenByPlayer = false;
    this.markedForRemoval = false;
}

var addInformation = function(list, inputInfo) {
    list = _.filter(list, function(info) {
        var allSimilar = (inputInfo.type === info.type && inputInfo.person === info.person && inputInfo.room === info.room);
        return !allSimilar;
    });
    list.push(inputInfo);
    return list;
}

// People 
var Person = function(name, idx) {
    this.name = name;
    this.hp = 10;
    this.idx = idx;
    this.queue = [];
    this.markedForRemoval = false;
    this.iShouldReportThis = false;
    this.information = [];
    this.conscious = true;
    this.addInformation = function(inputInfo) {
        if (findPerson(this) !== findPerson(player)) {
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
}

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

        var aliens = _.filter(findPerson(person).items, function(item) {
           return item.type === "Alien"; 
        });
        if (aliens.length > 0) {
            _.each(aliens, function(alien) {
                person.foundAlien(alien);
            });
            if (person.queue.length === 0) {
                brawl(person, aliens[0]);
            }
        } else {
            if (this.iShouldReportThis) {
                this.iShouldReportThis = false;
                report(person, true);
            }
        }
        preserve.call(person);
    }
}

var mixinPlayer = function(player) {
    var preserve = player.tick;
    player.tick = function() {
        if (this.hp === 1) {
            console.log("*** GAME OVER, YOU ARE DEAD");
        }
        _.each(information, function(info) {
            if (info.room === findPerson(player)) {
                info.markedForRemoval = true;
            }
        })
        preserve.call(player);
    }
}


var player = new Person("You", 0);
mixinPlayer(player);

var medic = new Person("Medic", 1);
mixinAI(medic);

var mechanic = new Person("Mechanic", 2);
mixinAI(mechanic);

var mercenary = new Person("Mercenary", 3);
mixinAI(mercenary);

var pilot = new Person("Pilot", 4);
mixinAI(pilot);

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
    this.activationTime = 12;
    this.type = GOO_STATUS;
    this.markedForRemoval = false;
    this.tick = function() {
        var room = findRoomByItemInstance(this);
        if (countAliensInRoom(room).length < 1) {
            this.activationTime = this.activationTime - 1;
            if (this.activationTime <= 0) {
                var currentRoom = room;
                var spawningAlien = new Alien();
                currentRoom.items.push(spawningAlien);
                this.activationTime = 5;

                if (room.crew.length > 0) {
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
                            _.each(others, function(person) {
                                person.foundAlien(spawningAlien);
                                clearPersonsQueuedActions(person);
                                brawl(person, spawningAlien);
                            })
                        }
                    }
                }
            }
        }
        if (this.hp <= 0) {
            this.markedForRemoval = true;
        }
    }
}

var alienCounter = 0;
var Alien = function() {
    this.name = "Alien" + alienCounter;
    alienCounter++;
    this.hp = 6;
    this.hidden = false;
    this.type = ALIEN_STATUS;
    this.markedForRemoval = false;
    this.tick = function() {
        if (this.hp <= 0) {
            if (findAlien(this) === findPerson(player)) logIfApplicable('-> Killed ' + this.name, findAlien(this));
            _.each(findAlien(this).crew, function(person) {
                person.defeatedAlien(this);
            }.bind(this));
            this.markedForRemoval = true;
        } else {
            if (findAlien(this).crew.length === 0) return;

            var alienRoom = findAlien(this);

            var amountBrawling = _.filter(findAlien(this).crew, function(person) {
                return (isBrawling(person, this));
            }.bind(this));


            var eligble = _.filter(findAlien(this).crew, function(person) {
                return canBeHit(person);
            });

            if (eligble.length < 1) {
                logIfApplicable('Alien has noone to hurt', alienRoom);
                return;
            }

            if (amountBrawling.length === 0) {
                var randomidx = Math.floor(Math.random() * eligble.length)
                var person = eligble[randomidx];
                person.hp = person.hp - 1;
                var random = (eligble.length > 1) ? 'randomly ' : ''
                logIfApplicable('Alien ' + random + 'hurts ' + person.name + ' for 1 HP, now he has ' + person.hp, alienRoom);
            } else if (amountBrawling.length === 1) {
                amountBrawling[0].hp = amountBrawling[0].hp - 1;
                logIfApplicable('Alien hurts lone brawler ' + amountBrawling[0].name + ' for 1 HP, now he has ' + amountBrawling[0].hp, alienRoom);
            } else {
                if (Math.random() > 0.8) {
                    var randomidx = Math.floor(Math.random() * amountBrawling.length)
                    var person = amountBrawling[randomidx];
                    person.hp = person.hp - 1;
                    logIfApplicable('Alien hurts brawler ' + person.name + ' for 1 HP, now he has ' + person.hp, alienRoom);
                } else {
                    logIfApplicable('Alien failed to hurt ' + prettyList(_.pluck(amountBrawling, 'name')) + ' because they where many', alienRoom);
                }
            }
        }
    }
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

var crew = [player, medic, pilot, mechanic, mercenary];

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
bridge.crew = [];
kitchen.crew = [player, mechanic, mercenary];
bedroom.crew = [medic];
storageroom.crew = [pilot];
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

var rooms = [escapePod1, bedroom, kitchen, bridge, engineroom, shieldroom, medbay, storageroom, escapePod2];

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
var brawl = function(who, what) {
    var action = {
        name: "Brawl",
        shortName: "B",
        duration: 999,
        what: what,
        event: function(duration) {
            what.hp = what.hp - 1;
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "Brawling scheduled";
}

var removeGoo = function(who, what) {
    var action = {
        name: "Remove Goo",
        shortName: "RG",
        duration: 4,
        what: what,
        event: function(duration) {
            what.hp = what.hp - 1;
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "Goo removal scheduled";
}

var searchTheShip = function() {
    _.each(crew, function(person) {
        investigate(person);
    })
}

var reportAll = function() {
    _.chain(crew).filter(function(person) {
        return (!(person.name === "You") && findPerson(person) !== findPerson(player))
    }).each(function(person) { report(person) });
}

var report = function(who, prio) {
    if (who.name === "You") return;
    var action = {
        name: "Report",
        shortName: "R",
        duration: 1,
        event: function(duration) {
            if (duration === 0) {
                if (who.information.length === 0) {
                    information = addInformation(information, new Information(ROOM_CLEAR_STATUS, who, findPerson(who), ""));
                } else {
                    _.each(who.information, function(info) {
                        information = addInformation(information, info);                    
                    });
                }
                who.information = [];
            }
            return true;
        }.bind(who)
    }
    if (prio) {
        who.queue.unshift(action);
    } else {
        who.queue.push(action);
    }
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
                        who.iShouldReportThis = true;
                        who.addInformation(new Information(ROOM_CLEAR_STATUS, who, findPerson(who), ""));
                    }
                } else {
                    if (findPerson(player) === room) {
                        var items = '';
                        _.each(foundItems, function(item) {
                            items += item.name + ', ';
                        });
                        console.log('*** ' + who.name + ' are done with investigation, found ' + items + ' ***');
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

var findAlien = function(what) {
    var room = _.filter(rooms, function(room) {
        var list = _.filter(room.items, function(alien) {
            return (alien === what);
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
            console.log('found it, returning true');
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
    return !!(who.conscious && who.queue[0] && who.queue[0].name === "Brawl" && who.queue[0].what === what);
}

var logIfApplicable = function(msg, room) {
    if (findPerson(player) === room) {
        console.log("*** " + msg);
    } else if (DEBUG_SHOW_HIDDEN_LOGS) {
        console.log("Hidden: *** " + msg);
    }
}

var prettyList = function(list) {
    var log = "";
    _.each(list, function(item, idx) {
        var divider = (list.length-2 === idx) ? " and " : ", ";
        log += item + divider;
    });
    if (list.length > 0) log = log.substr(0, log.length - 2);
    return log;
}

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

var transferInformationIfApplicable = function() {
    _.each(crew, function(person) {
        if (person !== player && (findPerson(person) === findPerson(player))) {
            _.each(person.information, function(info) {
                information = addInformation(information, info);                    
            });
            person.queue = _.filter(person.queue, function(action) {
                return (action.name !== "Report");
            })
            person.iShouldReportThis = false;
            person.information = [];
        }
    })
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

    transferInformationIfApplicable();

    return true;
}

var printShipStatus = function() {
    console.log("   Room status:");
    _.each(rooms, function(room) {
        var prettyPeople = "";
        if (DEBUG_SHOW_ALL_CREW || findPerson(player) === room) {
            _.each(room.crew, function(person) {
                var conscious = (!person.conscious) ? "@" : "";
                var prettyPerson = person.name + conscious;
                if (person.queue.length > 0) {
                    var duration = (person.queue[0].duration > 100) ? "~" : person.queue[0].duration;
                    prettyPerson += "[" + person.queue[0].shortName + "-" + duration + "]";
                }
                prettyPeople += prettyPerson + ", ";
            });
        } else {

            var applicableInfo = _.filter(information, function(info) {
                return info.room === room && info.type === LOCATION_STATUS;
            });
            if (applicableInfo.length > 0) {
                _.each(applicableInfo, function(info) {
                    prettyPeople += '(' + info.person.name + ')' + info.decay + ', ';
                });
            } else {
                prettyPeople = "-";
            }
        }
        var roomclear = _.filter(information, function(info) {
            return info.type === ROOM_CLEAR_STATUS && info.room === room;
        });
        var roomclearOutput = (roomclear[0]) ? '(' + roomclear[0].person.name + "[C]" + roomclear[0].decay + ") " : "";
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
                console.log('                        < ' + prettyItems + ' >');
            }
        }
        var applicableInfo = _.filter(information, function(info) {
            return ((info.type === ALIEN_STATUS) || (info.type === GOO_STATUS) || info.type === ALIEN_DEFEATED_STATUS) && room === info.room;
        });
        if (applicableInfo.length > 0) {
            var log = '                        { ';
            _.each(applicableInfo, function(info) {
                var newChars = (info.seenByPlayer === false) ? ' %%%%%%% ' : "";
                info.seenByPlayer = true;
                log += newChars + info.person.name + '(' + info.type + ')' + info.decay + newChars + ', ';
            })
            console.log(log + '}');
        }
    });
    console.log("   Ship status:");

    var applicableInfo = _.filter(information, function(info) {
        return info.type === ENGINE_STATUS;
    });
    if (applicableInfo.length > 0) {
        console.log('          Engine      : (' + applicableInfo[0].value + ')' + applicableInfo[0].decay);
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
        console.log('          Hull breach : (' + applicableInfo[0].value + ')' + applicableInfo[0].decay);
    } else {
        console.log("          Hull breach : -");
    }
    if (DEBUG_SHOW_TRUE_VALUES) console.log("          Hull breach : " + controlPanel.breachDetected);
}

var revealAll = function() {
    DEBUG_SHOW_TRUE_VALUES = true;
    DEBUG_SHOW_HIDDEN_ITEMS = true;
    DEBUG_SHOW_ALL_ITEMS = true;
    DEBUG_SHOW_ALL_CREW = true;
    printShipStatus();
    return "Revealed all DEBUG data";
}

var hideAll = function() {
    DEBUG_SHOW_TRUE_VALUES = false;
    DEBUG_SHOW_HIDDEN_ITEMS = false;
    DEBUG_SHOW_ALL_ITEMS = false;
    DEBUG_SHOW_ALL_CREW = false;
    printShipStatus();
    return "Resetting DEBUG to all false"
}

var gameTick = function() {
    console.log("");
    console.log("");
    console.log("New turn:");

    //Tick all crew
    _.each(ship.crew, function(person) {
        person.tick();
    });

    //Tick all items in rooms
    _.each(rooms, function(room) {
        _.each(room.items, function(item) {
            item.tick && item.tick();
        });
    });

    //Remove dead members
    ship.crew = _.filter(ship.crew, function(person) {
        return !(person.markedForRemoval === true);
    });

    //Brawl cleanup
    _.each(ship.crew, function(person) {
        if (person.queue[0] && person.queue[0].name === "Brawl" && person.queue[0].what.hp <= 0) {
            person.queue.shift();
        }
    });

    //Remove items
    _.each(rooms, function(room) {
        room.items = _.filter(room.items, function(item) {
            return !(item.markedForRemoval === true);
        });
    });

    //Decay information
    _.each(information, function(info) {
        info.decay = info.decay + 1;
    });
    _.each(crew, function(person) {
        _.each(person.information, function(info) {
            info.decay = info.decay + 1;
        })
    });

    //Remove old information
    information = _.filter(information, function(info) {
        return !(info.markedForRemoval);
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
if (TWO_ALIENS_IN_KITCHEN) {
    var spawningAlien = new Alien();
    kitchen.items.push(spawningAlien);
    var spawningAlien = new Alien();
    kitchen.items.push(spawningAlien);
}


setInterval(function() {
    if (HALTED) return;
    gameTick();
}, TICK_DURATION);


if (SCENARIO !== false) {
    console.log('Using Custom Scenario ' + SCENARIO + ':');
    switch(SCENARIO) {
        case 1:
            console.log('Medic and alien in same room, he should brawl and report without being asked');
            bridge.crew = [player];
            medbay.crew = [];
            storageroom.crew = [];
            kitchen.crew = [];
            engineroom.crew = [];
            bedroom.crew = [medic];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            var spawningAlien = new Alien();
            bedroom.items.push(spawningAlien);
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
        break;
        case 2:
            console.log('Asking for medic report, Medic and alien in same room, he should brawl and report');
            bridge.crew = [player];
            medbay.crew = [];
            storageroom.crew = [];
            kitchen.crew = [];
            engineroom.crew = [];
            bedroom.crew = [medic];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            var spawningAlien = new Alien();
            bedroom.items.push(spawningAlien);
            brawl(medic, spawningAlien);
            report(medic);
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
        break;
        case 3:
            console.log('Medic and alien in same room, abort brawl and report, should transfer infom then slay the alien and report it');
            bridge.crew = [player];
            medbay.crew = [];
            storageroom.crew = [];
            kitchen.crew = [];
            engineroom.crew = [];
            bedroom.crew = [medic];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            var spawningAlien = new Alien();
            bedroom.items.push(spawningAlien);
            gameTick();
            removeQueuedAction(medic);
            report(medic);
            gameTick();
            gameTick();
        break;
        case 4:
            console.log('Medic and goo in kitchen, he investigates and reports before spawning. Alien spawns, he defeates it and reports it. Pilot reports all clear.');
            bridge.crew = [player];
            medbay.crew = [];
            storageroom.crew = [];
            kitchen.crew = [medic];
            engineroom.crew = [];
            bedroom.crew = [];
            shieldroom.crew = [pilot];
            escapePod1.crew = [];
            escapePod2.crew = [];
            controlPanel.breachDetected = true;
            rooms[2].items.push(new Goo()); //kitchen
            investigate(medic);
            investigate(pilot);
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
        break;
        case 5:
            console.log('Medic and alien in bedroom, he defeates it, reports it, moves to kitchen where he also defeats alien, then reports rest');
            bridge.crew = [player];
            medbay.crew = [];
            storageroom.crew = [];
            kitchen.crew = [];
            engineroom.crew = [];
            bedroom.crew = [medic];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            var spawningAlien = new Alien();
            bedroom.items.push(spawningAlien);
            var spawningAlien = new Alien();
            kitchen.items.push(spawningAlien);
            gameTick();
            move(medic, kitchen);
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            /*gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();*/
        break;
        case 6:
            console.log('Medic and alien in bedroom, he defeates it and moves to kitchen where he meets player and informs him');
            bridge.crew = [];
            medbay.crew = [];
            storageroom.crew = [];
            kitchen.crew = [player];
            engineroom.crew = [];
            bedroom.crew = [medic];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            var spawningAlien = new Alien();
            bedroom.items.push(spawningAlien);
            gameTick();
            move(medic, kitchen);
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
        break;
        case 7:
            console.log('Medic and alien in bedroom, he defeates it, reports it, moves to kitchen where he find alien, then player walks in');
            bridge.crew = [player];
            medbay.crew = [];
            storageroom.crew = [];
            kitchen.crew = [];
            engineroom.crew = [];
            bedroom.crew = [medic];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            var spawningAlien = new Alien();
            bedroom.items.push(spawningAlien);
            var spawningAlien = new Alien();
            kitchen.items.push(spawningAlien);
            gameTick();
            move(medic, kitchen);
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            move(player, kitchen);
            gameTick();
            gameTick();
            //gameTick();
        break;
        case 8:
            bridge.crew = [player, pilot];
            medbay.crew = [];
            storageroom.crew = [];
            kitchen.crew = [];
            engineroom.crew = [];
            bedroom.crew = [];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            var spawningAlien = new Alien();
            bridge.items.push(spawningAlien);
            printShipStatus();
        break;
        case 9:
            pilot.hp = 2;
            bridge.crew = [pilot, mercenary]; //, , mechanic
            medbay.crew = [player];
            storageroom.crew = [];
            kitchen.crew = [];
            engineroom.crew = [];
            bedroom.crew = [];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            var spawningAlien = new Alien();
            bridge.items.push(spawningAlien);
            gameTick();
        break;
    }
} else {
    // Start game
    printShipStatus();
}


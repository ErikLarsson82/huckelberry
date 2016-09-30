//TODO
// - Order via telecom om uppe
// - AI hanterar om telecom är nere
// - Event Nebula; har sönder elektronik
// - asteroid hit, breach
// - searchrepeat
// - reactivate warp drive
// - rensa gammal info vid warp drive

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
var GOO_REMOVED_STATUS = "Goo removed";
var ROOM_CLEAR_STATUS = "Room clear";
var ROOM_EMPTY_STATUS = "Room empty";

var SCENARIO = false;

var DEBUG_SEED = 8461;

var DEBUG_SHOW_TRUE_VALUES = false;
var DEBUG_SHOW_HIDDEN_ITEMS = false;
var DEBUG_SHOW_ALL_ITEMS = false;
var DEBUG_SHOW_ALL_CREW = false;
var DEBUG_SHOW_HIDDEN_LOGS = false;
var DEBUG_DISABLE_RANDOM_CREW = false;
var DEBUG_DISABLE_MISSION = false;
var DEBUG_SHOW_EVENT_RESULT = false;

var BREAK_ENGINE_ON_STARTUP = false;
var GOO_IN_STORAGEROOM = false;
var GOO_IN_RANDOM_ROOM = false;
var ALIEN_IN_BEDROOM = false;
var TWO_ALIENS_IN_KITCHEN = false;
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


// Setup seed

var randomSeed = Math.round(Math.random() * 10000);
var seed = (DEBUG_SEED) ? DEBUG_SEED : randomSeed;
console.log("Using seed " + seed);
Math.seedrandom(seed);


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
    this.inventory = [];
    this.firemanCarry = null;
    this.iJustSawGooRemoved = function(goo) {
        this.iShouldReportThis = true;
        this.addInformation(new Information(GOO_REMOVED_STATUS, this, findPerson(this), goo));
    };
    this.hurt = function(what) {
        if (what instanceof Alien) {
            if (this.firemanCarry) {
                this.hp = this.hp - 3;
                return 3;
            } else {
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

var FirstAidKit = function() {}

var player = new Person("You", 0);
mixinPlayer(player);
player.inventory.push(new FirstAidKit());

var medic = new Person("Medic", 1);
mixinAI(medic);
medic.inventory.push(new FirstAidKit());

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
    this.activationTime = 20;
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
        if (this.hp < 0) {
            _.each(findItem(this).crew, function(person) {
                person.iJustSawGooRemoved(this);
            });
            this.markedForRemoval = true;
            controlPanel.breachDetected = false;
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
            if (findItem(this) === findPerson(player)) logIfApplicable('-> Killed ' + this.name, findItem(this));
            _.each(findItem(this).crew, function(person) {
                person.defeatedAlien(this);
            }.bind(this));
            this.markedForRemoval = true;
        } else {
            if (findItem(this).crew.length === 0) return;

            var alienRoom = findItem(this);

            var amountBrawling = _.filter(findItem(this).crew, function(person) {
                return (isBrawling(person, this));
            }.bind(this));


            var eligble = _.filter(findItem(this).crew, function(person) {
                return canBeHit(person);
            });

            if (eligble.length < 1) {
                logIfApplicable('Alien has noone to hurt', alienRoom);
                return;
            }
            if (amountBrawling.length === 0) {
                var randomidx = Math.floor(Math.random() * eligble.length)
                var person = eligble[randomidx];
                var dmg = person.hurt(this);
                var random = (eligble.length > 1) ? 'randomly ' : ''
                logIfApplicable('Alien ' + random + 'hurts ' + person.name + ' for ' + dmg + ' HP, now he has ' + person.hp, alienRoom);
            } else if (amountBrawling.length === 1) {
                var dmg = amountBrawling[0].hurt(this);
                logIfApplicable('Alien hurts lone brawler ' + amountBrawling[0].name + ' for '+dmg+' HP, now he has ' + amountBrawling[0].hp, alienRoom);
            } else {
                if (Math.random() > 0.8) {
                    var randomidx = Math.floor(Math.random() * amountBrawling.length)
                    var person = amountBrawling[randomidx];
                    var dmg = person.hurt(this);
                    logIfApplicable('Alien hurts brawler ' + person.name + ' for '+dmg+' HP, now he has ' + person.hp, alienRoom);
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

var placeCrewRandomly = function() {
    _.each(rooms, function(room) {
        room.crew = [];
    });
    _.each(crew, function(person) {
        var index = Math.floor(Math.random() * rooms.length);
        rooms[index].crew.push(person);
    })
}

var warp = function() {
    if (engine.status === BROKEN) {
        console.log('Ship failed to start warp drive .... engine is awfully quiet.');
        return;
    }      
    this.isWarp = true;
    this.downtime = 3;
    this.points = this.points - this.eventDuration;
    this.eventDuration = 0;
    console.log('Ship goes into warp drive, you have ' + this.points + ' points.');
}

var doors = [door1, door2, door3, door4, door5, door6, door7, door8];
var ship = {
    hull: 100,
    rooms: rooms,
    doors: doors,
    crew: crew,
    isWarp: false,
    eventDuration: 0,
    points: 100,
    downtime: 3,
    tick: function() {
        if (this.hull <= 0) {
            console.log("Ship hull destroyed, Game over");
            return;
        }
        if (this.isWarp) {
            if (controlPanel.breachDetected) {
                this.hull = this.hull - 20;
                console.log('Ship is in warp drive but something is off, things are not going smooth.');
            } else {
                this.downtime -= 1;
                console.log('Ship is in warp drive .... playing animation.');
                
                if (this.downtime <= 0) {
                    ship.isWarp = false;
                    startEvent();
                }
            }

        } else {
            this.eventDuration += 1;
        }
    },
    engageWarp: warp
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
var engageWarp = function(who) {
    var action = {
        name: "Engage warp",
        shortName: "W",
        duration: 4,
        event: function(duration) {
            if (findPerson(who) !== findItem(controlPanel)) {
                logIfApplicable('*** ' + who.name + ' cannot start warp due to not being in the same room', findPerson(who));
                return false;
            }
            if (duration === 0) {
                ship.engageWarp();
            }
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "Engage Warp scheduled";
}

var firemanCarry = function(who, whom) {
    var action = {
        name: "Carry",
        shortName: "A",
        duration: 3,
        whom: whom,
        event: function(duration) {
            if (findPerson(whom) !== findPerson(who)) {
                logIfApplicable('*** ' + who.name + ' cannot fireman carry ' + whom.name + ' due to not being in the same room', findPerson(who));
                return false;
            }
            if (who.firemanCarry) {
                logIfApplicable('*** ' + who.name + ' cannot fireman carry due to already carrying someone');
                return false;
            }
            if (duration === 0) {
                who.firemanCarry = whom;
                findPerson(who).crew = _.filter(findPerson(who).crew, function(person) {
                    return (person !== whom);
                })
            }
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "FiremanCarry scheduled";
}

var firemanCarryRelease = function(who) {
    var whom = who.firemanCarry;
    who.firemanCarry = null;
    findPerson(who).crew.push(whom);
    return "Dropping " + whom.name + " on the floor of " + findPerson(who).name;
}

var wake = function(who, whom) {
    var items = _.filter(whom.inventory, function(item) {
        return (item instanceof FirstAidKit);
    });
    if (items === 0) return who.name + " doesnt have FirstAidKit";

    var action = {
        name: "Wake",
        shortName: "W",
        duration: 2,
        whom: whom,
        event: function(duration) {
            if (duration === 0) {
                if (findPerson(whom) === findPerson(who)) {
                    whom.hp = whom.hp + 1;
                    whom.conscious = true;
                }
            }
            return true;
        }.bind(who)
    }
    who.queue.push(action);
    return "Waking scheduled";
}

var brawl = function(who) {
    if (who.firemanCarry) {
        return "Cannot brawl while carrying " + who.firemanCarry.name;
    }
    var what = _.find(findPerson(who).items, function(item) {
        return (item instanceof Alien);
    });
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

var removeGoo = function(who) {
    var goo = _.find(findPerson(who).items, function(item) {
        return (item instanceof Goo) && !item.hidden;
    });
    if (goo) {
        var action = {
            name: "Remove Goo",
            shortName: "RG",
            duration: 4,
            what: goo,
            event: function(duration) {
                goo.hp = goo.hp - 1;
                return true;
            }.bind(who)
        }
        who.queue.push(action);
        return "Goo removal scheduled";
    } else {
        return "Found no goo to remove";
    }
}

var searchTheShip = function() {
    _.each(crew, function(person) {
        investigate(person);
    })
}

var reportAll = function(prio) {
    _.chain(crew).filter(function(person) {
        return (!(person.name === "You") && findPerson(person) !== findPerson(player))
    }).each(function(person) { report(person, prio) });
}

var report = function(who, prio) {
    if (who.name === "You") return;
    if (who.queue[0] && who.queue[0].name === "Report") return;
    var action = {
        name: "Report",
        shortName: "R",
        duration: 1,
        event: function(duration) {
            if (duration === 0) {
                if (who.information.length === 0) {
                    information = addInformation(information, new Information(ROOM_EMPTY_STATUS, who, findPerson(who), ""));
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
}

var moveRoute = function(who, where) {
    function moveOnePersonOneRoute(who, where) {
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
    if (who instanceof Person) {
        return moveOnePersonOneRoute(who, where);
    } else if (who instanceof Array) {
        _.each(who, function(person) {
            moveOnePersonOneRoute(person, where);
        })
        return who.length + " eventually scheduled";
    } else if (who instanceof Room) {
        _.each(who.crew, function(person) {
            moveOnePersonOneRoute(person, where);
        })
        return who.crew.length + " eventually scheduled";
    }
}

var moveAndReportRoute = function(who, where) {
    var route = findRoute(findPerson(who), where);
    if (route) {
        route.shift();
        _.each(route, function(stop) {
            move(who, stop);
            report(who);
        });
        return "Route scheduled with " + (route.length - 1) + ' stops';
    } else {
        return "Route failed"
    }
}

var movevteAndReportRoute = function(who, where) {
    var route = findRoute(findPerson(who), where);
    if (route) {
        route.shift();
        _.each(route, function(stop) {
            move(who, stop);
            investigate(who);
            report(who);
        });
        return "Route scheduled with " + (route.length - 1) + ' stops';
    } else {
        return "Route failed"
    }
}

var moveInvestigateRoute = function(who, where) {
    var route = findRoute(findPerson(who), where);
    if (route) {
        route.shift();
        _.each(route, function(stop) {
            move(who, stop);
            investigate(who);
        });
        return "Route scheduled with " + (route.length - 1) + ' stops';
    } else {
        return "Route failed"
    }
}

var investigate = function(who) {
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

var findItem = function(what) {
    var room = _.filter(rooms, function(room) {
        var list = _.filter(room.items, function(item) {
            return (item === what);
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
var isAnyInformationCritical = function(information) {
    var criticalInfo = _.filter(information, function(info) {
        return (info.type === ALIEN_STATUS || info.type === ALIEN_DEFEATED_STATUS || info.type === GOO_STATUS);
    });
    return (criticalInfo.length > 0);
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
        if (person !== player && (findPerson(person) === findPerson(player)) && person.conscious) {
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
    return true;
}

var printShipStatus = function() {
    console.log("   Room status:");
    _.each(rooms, function(room) {

        //Print room
        var prettyPeople = "";
        if (DEBUG_SHOW_ALL_CREW || findPerson(player) === room) {
            //Player is in the room
            _.each(room.crew, function(person) {
                var conscious = (!person.conscious) ? "@" : "";
                var prettyPerson = person.name + conscious;
                if (person.queue.length > 0) {
                    var duration = (person.queue[0].duration > 100) ? "~" : person.queue[0].duration;
                    prettyPerson += "[" + person.queue[0].shortName + "-" + duration + "]";
                }
                if (person.firemanCarry) {
                    prettyPerson += "\\"+person.firemanCarry.name+"/"   
                }
                prettyPeople += prettyPerson + ", ";
            });
        } else {
            //Print all info about the room
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
        console.log("          " + room.name + ": " + prettyPeople);

        //Print all items in the room
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
            return room === info.room;
        });

        if (applicableInfo.length > 0) {

            var types = [ROOM_EMPTY_STATUS, ROOM_CLEAR_STATUS, ALIEN_STATUS, ALIEN_DEFEATED_STATUS, GOO_STATUS, GOO_REMOVED_STATUS];

            var printStatus = function(type) {
                var typeInfo = _.filter(applicableInfo, function(info) {
                    return (type === info.type);
                });
                if (typeInfo.length > 0) {
                    _.each(typeInfo, function(info) {
                        var log = '                        { ';
                        var newChars = "";
                        newChars = (info.seenByPlayer === false) ? ' %%%%%%% ' : "";
                        info.seenByPlayer = true;
                        log += newChars + info.person.name + ' (' + type + ') ' + info.decay + newChars;
                        console.log(log + '}');
                    });
                }
            }
            _.each(types, printStatus);
        }
    });
    console.log("   Ship status:");

    var applicableInfo = _.filter(information, function(info) {
        return info.type === ENGINE_STATUS;
    });
    if (applicableInfo.length > 0) {
        var newChars = (applicableInfo[0].seenByPlayer === false) ? ' %%%%%%% ' : "";
        applicableInfo[0].seenByPlayer = true;
        console.log('          Engine      : (' + newChars + applicableInfo[0].value + ')' + applicableInfo[0].decay);
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
        var newChars = (applicableInfo[0].seenByPlayer === false) ? ' %%%%%%% ' : "";
        applicableInfo[0].seenByPlayer = true;
        console.log('          Hull breach : (' + newChars + applicableInfo[0].value + ')' + applicableInfo[0].decay);
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

    //Tick ship
    ship.tick();
    if (ship.isWarp) return;
    
    console.log("New turn:");

    //Tick all crew
    _.each(ship.crew, function(person) {
        person.tick();
    });

    //Transfer info, someone might have woken up or entered a room
    _.each(ship.crew, function(person) {
        transferInformationIfApplicable(person);
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

var startEvent = function() {

    if (DEBUG_DISABLE_MISSION) {
        return;
    }

    if (DEBUG_DISABLE_RANDOM_CREW) {
        bridge.crew = [pilot];
        medbay.crew = [player];
        storageroom.crew = [];
        kitchen.crew = [];
        engineroom.crew = [];
        bedroom.crew = [];
        shieldroom.crew = [];
        escapePod1.crew = [];
        escapePod2.crew = [];
    } else {
        placeCrewRandomly();
    }

    var result = Math.random();

    if (DEBUG_SHOW_EVENT_RESULT) {
        console.log('Event result = ' + result)
    }

    var stuff = [
        function() {
            var crewExceptYou = _.filter(crew, function(person) {
                return (person !== player);
            })
            var target = crewExceptYou[Math.floor(Math.random() * crewExceptYou.length)];
            target.conscious = false;
            var rest = _.filter(crewExceptYou, function(person) {
                return (person !== target)
            });
            var finder = rest[Math.floor(Math.random() * rest.length)];
            findPerson(finder).crew = _.filter(findPerson(finder).crew, function(person) {
                return (person !== finder);
            })
            findPerson(target).crew.push(finder);
            console.log(finder.name + " finds " + target.name + " unconsious");
        },
        function() {
            engine.status = BROKEN;
            console.log("You feel the ship rumbling, something seems off");
        },
        function() {
            var countRooms = rooms.length;
            var randomIndex = Math.floor(Math.random() * countRooms);
            controlPanel.breachDetected = true;
            rooms[randomIndex].items.push(new Goo());
            console.log("You feel the ship rumbling, something seems off");
        },
        function() {
            var countRooms = rooms.length;
            var randomIndex = Math.floor(Math.random() * countRooms);
            controlPanel.breachDetected = true;
            rooms[randomIndex].items.push(new Goo());
            var spawningAlien = new Alien();
            rooms[randomIndex].items.push(spawningAlien);
            console.log("You feel the ship rumbling, something seems off");
        },
        function() {
            var countRooms = rooms.length;
            var randomIndex = Math.floor(Math.random() * countRooms);
            controlPanel.breachDetected = true;
            rooms[randomIndex].items.push(new Goo());
            var spawningAlien = new Alien();
            rooms[randomIndex].items.push(spawningAlien);

            engine.status = BROKEN;
            console.log("You feel the ship rumbling, something seems off");
        },
    ];

    if (result < 0.3) {
        stuff[0]();
    } else if (result < 0.4) {
        stuff[1]();
    } else if (result < 0.7) {
        stuff[2]();
    } else if (result < 0.9) {
        stuff[3]();
    } else {
        stuff[4]();
    }
}

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
            console.log('Running command ' + bedroom.items.push(spawningAlien));
            gameTick();
            console.log('Running command ' + report(medic, true));
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
            console.log('Running command ' + investigate(medic));
            console.log('Running command ' + investigate(pilot));
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
        case 10:
            bridge.crew = [medic]; //, , mechanic
            medbay.crew = [];
            storageroom.crew = [player];
            kitchen.crew = [];
            engineroom.crew = [];
            bedroom.crew = [];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            printShipStatus();
        break;
        case 11:
            mechanic.hp = 2;
            bridge.crew = [medic]; //, , 
            medbay.crew = [];
            storageroom.crew = [];
            kitchen.crew = [player];
            engineroom.crew = [];
            bedroom.crew = [mechanic];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            var spawningAlien = new Alien();
            bedroom.items.push(spawningAlien);
            //mechanic.conscious = false;
            gameTick();
            gameTick();
            move(player, bedroom);
            gameTick();
            gameTick();
            brawl(player, bedroom.items[0]);
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
        break;
        case 12:
            mechanic.conscious = false;
            bridge.crew = [player, mechanic];
            medbay.crew = [];
            storageroom.crew = [];
            kitchen.crew = [];
            engineroom.crew = [];
            bedroom.crew = [];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            firemanCarry(player, mechanic);
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            var spawningAlien = new Alien();
            bridge.items.push(spawningAlien);
        break;
        case 13:
            bridge.crew = [player];
            medbay.crew = [mechanic, medic];
            storageroom.crew = [];
            kitchen.crew = [];
            engineroom.crew = [];
            bedroom.crew = [];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            report(mechanic);
            report(medic);
            gameTick();
            gameTick();
            
        break;
        case 15:
            bridge.crew = [player];
            medbay.crew = [];
            storageroom.crew = [];
            kitchen.crew = [mechanic];
            engineroom.crew = [];
            bedroom.crew = [];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            controlPanel.breachDetected = true;
            kitchen.items.push(new Goo());
            investigate(mechanic);
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            gameTick();
            removeGoo(mechanic);
            gameTick();
            gameTick();
            gameTick();

        break;
        case 16:
            bridge.crew = [player, pilot];
            medbay.crew = [];
            storageroom.crew = [];
            kitchen.crew = [];
            engineroom.crew = [];
            bedroom.crew = [];
            shieldroom.crew = [];
            escapePod1.crew = [];
            escapePod2.crew = [];
            engageWarp(pilot);
            gameTick();
            gameTick();
            gameTick();
            gameTick();
        break;
    }
} else {
    // Start game
    startEvent();
    printShipStatus();
}


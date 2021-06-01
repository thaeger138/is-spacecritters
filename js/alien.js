class Alien {
    constructor(alienColor, defaultCombatEnergy, perception) {
        this.energy = 100;
        this.id = 1;
        this.moveCode;
        this.actionCode;
        let x = Math.floor(Math.random() * (gridSize));
        let z = Math.floor(Math.random() * (gridSize));
        while(distanceToNearestStar(x,z) > 3 || distanceToNearestStar(x,z) === -1) {
            x = Math.floor(Math.random() * (gridSize));
            z = Math.floor(Math.random() * (gridSize));
        }
        this.position = [x, 0.25, z];
        this.perception = perception;
        this.defaultCombatEnergy = (defaultCombatEnergy === null) ? parseInt(defaultCombatEnergy) : 1;
        this.cubeMat = new THREE.MeshBasicMaterial( { color: alienColor } );
        this.cubes = [new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), this.cubeMat)];
        this.cubes[0].position.set(this.position[0],0.25,this.position[2]);
        this.cubes[0].name = this.id++;
        updateCubeOnMap(this.cubes[0]);
        scene.add(this.cubes[0]);
        this.commandLookUp = {
            id: function(args, i, alien) {
                return alien.cubes[i].name;
            },
            pos: function(args, i, alien) {
                switch(args) {
                    case "x":
                        return alien.cubes[i].position.x;
                        break;
                    case "y":
                        return alien.cubes[i].position.z;
                        break;
                    default:
                        console.log("invalid pos call");
                        return;
                }
            },
            dist: function(args, i, alien) {
                switch(args) {
                    case "star":
                        return distanceToNearestStar(alien.cubes[i].position.x,alien.cubes[i].position.z);
                        break;
                    case "alien":
                        let dist = distanceToNearestAlien(alien.cubes[i], alien.perception);
                        return distance(alien.cubes[i].position.x, alien.cubes[i].position.z, dist[0], dist[2]);
                        break;
                    default:
                        console.log("invalid dist call");
                        return;
                }
            },
            alienCount: function(args, i, alien) {
                return alien.cubes.length;
            },
            energy: function(args, i, alien) {
                return alien.energy;
            },
            spotEnergy: function(args, i, alien) {
                return energyMap[alien.cubes[i].position.x][alien.cubes[i].position.z];
            }
        };
        this.operatorLookUp = {
            "<": function(a, b) {
                return (a < b);
            },
            ">": function(a, b) {
                return (a > b);
            },
            ">=": function(a, b) {
                return (a >= b);
            },
            "<=": function(a, b) {
                return (a <= b);
            },
            "!=": function(a, b) {
                return (a != b);
            },
            "=": function(a, b) {
                return (a == b);
            },
            "%": function(a, b) {
                return ((a % b) == 0);
            }
        };
    }

    move(x,z,index) {
        if(x === 0 && z === 0) {
            //do nothing
        } else if(x >= -1 && x <= 1 && z >= -1 && z <= 1) {
            if(isInBounds(this.cubes[index].position.x, x) && isInBounds(this.cubes[index].position.z, z) && this.energy >= 1) {
                this.energy -= 1;
                this.cubes[index].position.x += x;
                this.cubes[index].position.z += z;
                for(var j = 0; j < stars.length; j++) {
                    if(this.cubes[index].position.x == stars[j].position[0] && this.cubes[index].position.z == stars[j].position[2]) {
                        scene.remove(this.cubes[index]);
                        this.cubes.splice(index,1);
                        return;
                    }
                }
            }
        }
        updateCubeOnMap(this.cubes[index]);
    }

    //checks energy at spot, adds a portion of it to alien energy pool
    harvest(i) {
        this.energy += Math.ceil(energyMap[this.cubes[i].position.x][this.cubes[i].position.z] / 10);
    }

    makeAlien(i) {
        if(this.cubes.length < alienCap && this.energy >= 5) {
            this.energy -= 5;
            this.cubes.push(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), this.cubeMat));
            this.cubes[this.cubes.length-1].position.set(this.cubes[i].position.x,this.cubes[i].position.y,this.cubes[i].position.z);
            this.cubes[this.cubes.length-1].name = this.id++;
            scene.add(this.cubes[this.cubes.length-1]);
            updateCubeOnMap(this.cubes[this.cubes.length-1]);
            return;
        } else {
            return;
            // console.log("out of energy or too many aliens");
        }
    }

    fight(i,inputEnergy) {
        this.energy -= ((this.perception * this.perception) + parseInt(inputEnergy));
        let dist = distanceToNearestAlien(this.cubes[i],this.perception);
        let xDif = dist[0] - this.cubes[i].position.x;
        let zDif = dist[2] - this.cubes[i].position.z;
        if(Math.sqrt(xDif*xDif + zDif*zDif) > this.perception || dist[0] === -1 || dist[1] === -1 || dist[2] === -1) return;
        const points = [];
        points.push(new THREE.Vector3(this.cubes[i].position.x, this.cubes[i].position.y, this.cubes[i].position.z));
        points.push(new THREE.Vector3(dist[0], dist[1], dist[2]));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, this.cubeMat);
        scene.add(line);
        fightLines.push(line);
        let combatant = alienLookup.get(map[dist[0]][dist[2]][dist[1]].material.color);
        if(inputEnergy > combatant.defaultCombatEnergy) {
            scene.remove(map[dist[0]][dist[2]][dist[1]]);
            combatant.energy -= combatant.defaultCombatEnergy;
            combatant.cubes.splice(combatant.cubes.indexOf(map[dist[0]][dist[2]][dist[1]]),1);
        } else if (inputEnergy == combatent.defaultCombatEnergy) {
            return;
        } else {
            scene.remove(this.cubes[i]);
            this.cubes.splice(i,1);
        }

    }

    executeCode(commands, i) {
        for(var j = 0; j < commands.length; j++) {
            let command, tempLeft, tempRight, logicBool;
            command = commands[j];
            if(command.name === "if") {
                //check if it is an & and work from there
                let operator = command.commands[0];
                //if the operator is &, evaluate left and right and return command if both are true
                if (operator.op === "&") {
                    tempLeft = this.handleOperator(operator.left, i);
                    tempRight = this.handleOperator(operator.right, i);
                    if(tempLeft && tempRight) {
                        return command.subcommand;
                    } else {
                        continue;
                    }
                } else if (operator.op === "|") {
                    tempLeft = this.handleOperator(operator.left, i);
                    tempRight = this.handleOperator(operator.right, i);
                    if(tempLeft || tempRight) { 
                        logicBool = true;
                    } else {
                        continue;
                    }
                } else {
                    logicBool = this.handleOperator(operator, i);
                }
                //if the if evaluates to true, execute the command after the if statement
                if(logicBool) return command.subcommand;
            } else if (typeof command === "object") {
                return command;
            } else {
                console.log("invalid command or action");
                return;
            }
        }
    }

    handleOperator(operator, i) {
        let tempLeft, tempRight;
        //if the operator is an and, handle it recursivly, other wise set the left
        if (operator.op === "&") {
            tempLeft = this.handleOperator(operator.left, i);
            tempRight = this.handleOperator(operator.right, i);
            if(tempLeft && tempRight) {
                return true;
            } else {
                return false;
            }
        } else if (operator.op === "|") {
            tempLeft = this.handleOperator(operator.left, i);
            tempRight = this.handleOperator(operator.right, i);
            if(tempLeft || tempRight) {
                return true;
            } else {
                return false;
            }
        } else if (typeof operator.left === "object") {
            tempLeft = this.commandLookUp[operator.left.name](operator.left.args, i, this);
        } else {
            tempLeft = parseInt(operator.left);
        }
        //after setting the left, set the right
        if (typeof operator.right === "object") {
            //if the right is an operator, send it back;
            if (operator.right.op != undefined) {
                tempRight = this.handleOperator(operator.right, i);
            } else {
                tempRight = this.commandLookUp[operator.right.name](operator.right.args, i, this);
            }
        } else {
            tempRight = parseInt(operator.right);
        }
        //after finding the left and right, evaluate and return
        if(this.operatorLookUp[operator.op](tempLeft, tempRight)) {
            return true;
        } else {
            return false;
        }
    }

    getMove(i) {
        if(this.energy <= 0) {
            Aliens.splice(Aliens.indexOf(this),1);
            for(var i = 0; i < this.cubes.length; i++) {
                scene.remove(this.cubes[i]);
            }
        }
        if(this.cubes[i] == undefined) return;
        // console.log(distanceToNearestAlien(this.cubes[i]));
        let move = this.executeCode(this.moveCode, i); //this will be the final command found
        // console.log(move);
        switch(move.name) {
            case "up":
                return this.move(1,0,i);
                break;
            case "down":
                return this.move(-1,0,i);
                break;
            case "left":
                return this.move(0,-1,i);
                break;
            case "right":
                return this.move(0,1,i);
                break;
            case "random":
                if(Math.random() < 0.5) return this.move(getRandom(),0,i);
                return this.move(0,getRandom(),i);
                break;
            case "skip":
                return this.move(0,0,i);
                break;
            default:
                console.log("no move taken");
                return;
        }
    }

    getAction(i) {
        if(this.cubes[i] == undefined) return;
        
        let action = this.executeCode(this.actionCode, i); //this will be the final command found
        // console.log(action);
        switch(action.name) {
            case "fight":
                return this.fight(i, action.args);
                break;
            case "harvest":
                return this.harvest(i);
                break;
            case "duplicate":
                return this.makeAlien(i);
                break;
            case "skip":
                return;
                break;
            default:
                console.log("no action taken");
                return;
        }
    }
    
    executeMove() {
        for(var i = 0; i < this.cubes.length; i++) {
            this.getMove(i);
        }
    }

    executeAction() {
        let tempLength = this.cubes.length
        for(var i = 0; i < tempLength; i++) {
            this.cubes[i].position.y = map[this.cubes[i].position.x][this.cubes[i].position.z].indexOf(this.cubes[i]) + 0.25;
            this.getAction(i);
        }
    }
}
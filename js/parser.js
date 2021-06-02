class Parser {
  constructor(text) {
    this.text = text;
    this.index = 0;
  }

  remainingTokens() {
      return this.index < this.text.length;
  }

  getIf() {
    while (this.text.charAt(this.index++) !== '[' && this.remainingTokens()) {
      /* empty */
    }
    let start = this.index;

    let bracketCount = 1;
    while (bracketCount > 0 && this.remainingTokens()) {
      let char = this.text.charAt(this.index++);
      if (char === '[') {
        bracketCount++;
      } else if (char === ']') {
        bracketCount--;
      }
    }
    let end = this.index;
    return this.text.substring(start, end - 1);
  }

  //borrowed/adapted from codetrain's logo interpreter
  nextToken() {
    let token = '';
    var ch = this.text.charAt(this.index);

    // If it's a space ignore
    if (ch == ' ') {
      this.index++;
      return this.nextToken();
    }

    // If it's a bracket send that back
    if (ch == '[' || ch == ']') {
      this.index++;
      console.log(String.valueOf(ch));
      return String.valueOf(ch);
    }

    // Otherwise accumulate until a space or return
    while (ch != ' ' && this.remainingTokens()) {
      if (ch.match(/[\r\n]/)) {
        this.index++;
        return token;
      }
      token += ch;
      this.index++;
      if (this.remainingTokens()) {
        ch = this.text.charAt(this.index);
      } else {
        break;
      }
    }
    return token;
  }

  parse() {
    //explain this
    let movement = /^(up|down|left|right|random|skip)$/;
    let playerInterface = /^(dist|energy|id|turn|spotEnergy|alienCount|pos|perception)$/;
    let action = /^(fight|harvest|duplicate)$/;
    let operator = /([<>=&%|]|[!=]|[>=]|[<=])/;
    let digit = /[0-9]/;
    let myIf = /^if$/;
    let commands = [];
    while (this.remainingTokens()) {
      let token = this.nextToken();
      if (movement.test(token)) {
        let cmd = new Command(token);
        commands.push(cmd);
      } else if (action.test(token)) {
        if(token == 'fight') {
          let cmd = new Command(token, this.nextToken());
          commands.push(cmd);
        } else {
          let cmd = new Command(token);
          commands.push(cmd);
        }
      } else if (playerInterface.test(token)) {
        if(token == 'dist' || token == 'pos') {
          let cmd = new Command(token, this.nextToken());
          commands.push(cmd);
        } else {
          let cmd = new Command(token);
          commands.push(cmd);
        }
      } else if (operator.test(token)) {
        let op = new Operator(token);
        commands.push(op);
      } else if (myIf.test(token)) {
        let cmd = new Command(token);
        let toIf = this.getIf();
        let parser = new Parser(toIf);
        cmd.commands = parser.parse();
        commands.push(cmd);
      } else if (digit.test(token)) {
        commands.push(token);
      } else {
        console.log("no match for: '" + token + "'");
      }
    }
    return commands;
  }

  organizeCommands(commands) {
    //explain this lol
    for(var i = 0; i < commands.length; i++) {
      let command = commands[i];
      if(command.name === "if") {
        command.commands = this.organizeCommands(command.commands);
        command.subcommand = commands[i+1];
        commands.splice(i,2,command);
      } else if ((i+1 < commands.length) && commands[i+1].op != undefined) {
        i++;
        let tempOp = commands[i];
        if(tempOp.op === "&") {
          tempOp.left = commands[i-1];
          tempOp.right = this.organizeCommands(commands.slice(i+1,commands.length))[0];
          commands.splice(i-1,commands.length-i+1,tempOp);
        } else if(tempOp.op === "|") {
          tempOp.left = commands[i-1];
          tempOp.right = this.organizeCommands(commands.slice(i+1,commands.length))[0];
          commands.splice(i-1,commands.length-i+1,tempOp);
        } else {
          tempOp.left = commands[i-1];
          tempOp.right = commands[i+1];
          commands.splice(i-1,3,tempOp);
          i-=2;
        }
      } else {
        // do nonthing, the command just stays put
        // commands.splice(i,1,command);
      }
    }
    return commands;
  }
}
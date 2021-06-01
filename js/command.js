class Command {
    constructor(name, args) {
        this.name = name;
        this.args = args;
        this.commands = [];
        this.subcommand;
    }
}
# Typescript framework for creating Discord bots

## Example

```javascript
import { bootstrap, Command, Handler, hasRoles } from "discord-framework";

// Ping command
@Command({
    name: 'ping'
})
class PingCommand {
    action() { return 'Pong!'; }
}

// Admin specific command
@Command({
    name: 'kick',
    arguments: [{ key: 'userToKick', type: 'member' }],
    canRun: hasRoles(['admin'], 'Whoops you need the admin role')
})
class AdminCommand {
    action({ args }) {
        args.userToKick.kick();
        return `${args.userToKick.name} has been kicked!`;
    }
}

@Handler({
    name: 'main',
    commands: [PingCommand, AdminCommand]
})
class MainHandler { }

bootstrap(MainHandler, {
    prefix: '!',
    token: '<Discord bot token>'
}).on('ready', () => console.log('Bot is ready'));
```

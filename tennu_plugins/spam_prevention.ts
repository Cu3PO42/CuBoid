import { randomBytes } from 'crypto';

const newUsers = new Set<string>();
const unbanTokens = new Map<string, string>();

function generateNewToken() {
    let token;
    while (unbanTokens.has(token = randomBytes(32).toString('base64')));
    return token;
}

export function init(client: Tennu.Client, pluginImports: Tennu.PluginImports) {
    function raw(message: string) {
        client.info(`-> ${message}`);
        client._socket.raw(message);
    }

    function kick(channel: string, user: string, reason?: string) {
        raw(reason ? `KICK ${channel} ${user} :${reason}` : `KICK ${channel} ${user}`);
    }

    function ban(channel: string, user: string) {
        raw(`MODE ${channel} +b ${user}`);
    }

    function unban(channel: string, user: string) {
        raw(`MODE ${channel} -b ${user}`);
    }

    const participatingChannels = new Set<string>(client.config('spampreventionchannels') || []);
    
    return {
        handlers: {
            join(message: Tennu.Message) {
                newUsers.add(`${message.nickname}@${message.channel}`);
            },

            privmsg(message: Tennu.MessagePrivmsg) {
                const id = `${message.nickname}@${message.channel}`;
                if (!newUsers.has(id))
                    return;
                
                newUsers.delete(id);
                if (message.message.toUpperCase() !== message.message)
                    return;

                const token = generateNewToken();
                unbanTokens.set(token, message.hostmask.hostname);
                setTimeout(() => unbanTokens.delete(token), 300000);
                client.say(message.nickname, 'You have been suspected of spamming and been banned from some channels.');
                client.say(message.nickname, `If you are not a bot, please reply to this message with "$unbanme ${token}" and rejoin.`);
                client.say(message.nickname, 'This token expires in 5 minutes.');

                for (const channel of participatingChannels) {
                    kick(channel, message.nickname, 'You have been suspected of spamming.');
                    ban(channel, message.nickname);
                }
            },

            '!unbanme'(command: Tennu.Command) {
                if (!unbanTokens.has(command.args[0]))
                    return;
                
                const host = unbanTokens.get(command.args[0]);
                unbanTokens.delete(command.args[0]);
                for (const channel of participatingChannels) {
                    unban(channel, command.nickname);
                }
            },

            help: {
                'unbanme': [
                    'unbanme <token>',
                    ' ',
                    'Unbans a user that has been banned by automatic spam prevention.'
                ]
            },

            commands: ['unbanme']
        },

    };
}
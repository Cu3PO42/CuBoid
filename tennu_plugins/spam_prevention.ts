import { randomBytes } from 'crypto';
import { join } from 'path';
import * as fs from 'fs';

const banTimeout = 6 * 3600 * 1000;

interface UnbanItem {
    hostmask: string;
    expires: number;
    token: string;
    user: string;
}

interface Ban {
    channel: string;
    hostmask: string;
    setBy: string;
    timestamp: number;
}

interface BanResolver {
    resolve: (banlist: Ban[]) => void;
    reject: (err: Error) => void;
    promise: Promise<Ban[]>;
    inProgress: Ban[];
}

function loadTokens() {
    try {
        const file = fs.readFileSync(join(__dirname, 'unbantokens.json'), 'utf-8');
        return new Map<string, UnbanItem>(JSON.parse(file));
    } catch (e) {
        return new Map<string, UnbanItem>();
    }
}

const newUsers = new Set<string>();
const unbanTokens = loadTokens();

function saveTokens() {
    fs.writeFileSync(join(__dirname, 'unbantokens.json'), JSON.stringify(Array.from(unbanTokens)), 'utf-8');
}

function generateNewToken() {
    let token;
    while (unbanTokens.has(token = randomBytes(30).toString('base64')));
    return token;
}

process.on('exit', saveTokens);

export function init(client: Tennu.Client, pluginImports: Tennu.PluginImports) {
    const banlistPromiseResolver = new Map<string, BanResolver>();

    const participatingChannels = new Set<string>(client.config('spampreventionchannels').map((e: string) => e.toLowerCase()) || []);
    const sourceChannels = new Set<string>(client.config('spamsourcechannels').map((e: string) => e.toLowerCase()) || []);
    participatingChannels.forEach(Set.prototype.add.bind(sourceChannels));

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

    async function liftBan(item: UnbanItem) {
        if (item === undefined || !unbanTokens.has(item.token)) return;

        const liftedBans = [];
        for (const channel of participatingChannels) {
            const banlist = await getBanlist(channel);
            const banItem = banlist.find(e => e.hostmask === item.hostmask);
            if (banItem === undefined) continue;

            if (banItem.setBy === 'CuBoid') {
                unban(channel, banItem.hostmask);
                liftedBans.push(channel);
            }
        }

        client.say(item.user, `Your ban from the following channels has been lifted: ${liftedBans.join(', ')}`);
        unbanTokens.delete(item.token);
    }

    async function getBanlist(channel: string) {
        channel = channel.toLowerCase();
        if (banlistPromiseResolver.has(channel)) {
            return await banlistPromiseResolver.get(channel).promise;
        }

        raw(`MODE ${channel} +b`);
        let resolver: any = {};
        const promise = new Promise<Ban[]>((resolve, reject) => {
            resolver = { resolve, reject, inProgress: [] };
            banlistPromiseResolver.set(channel, resolver as BanResolver);
        });
        resolver.promise = promise;
        return await promise;
    }

    // Lift bans that have expired since CuBoid has last run 
    for (const item of unbanTokens.values()) {
        if (item.expires <= Date.now()) {
            liftBan(item);
        } else {
            setTimeout(liftBan, item.expires - Date.now(), item);
        }
    }
    
    return {
        handlers: {
            join(message: Tennu.Message) {
                const channel = message.channel.toLocaleLowerCase();
                if (sourceChannels.has(channel))
                    newUsers.add(`${message.nickname}@${channel}`);
            },

            privmsg(message: Tennu.MessagePrivmsg) {
                const channel = message.channel.toLocaleLowerCase();
                const id = `${message.nickname}@${channel}`;
                if (!newUsers.has(id))
                    return;
                
                newUsers.delete(id);
                let isBot;
                switch(true) {
                    case message.message.toUpperCase() === message.message && message.message.length >= 25:
                    case message.message.toUpperCase().includes('GLOBAL IRC ADVERTISING'):
                    case message.message.includes('interested in this blog by'):
                    case message.message.includes('stop the flood'):
                        isBot = true;
                        break;
                    case /https?:\/\/(?:\w+\.)?chatzy\.com/.test(message.message):
                        isBot = true;
                        break;
                    default:
                        return;
                }

                const token = generateNewToken();
                const hostmask = `*!*@${message.hostmask.hostname}`;
                const unbanItem: UnbanItem = { hostmask, expires: Date.now() + banTimeout, token, user: message.nickname };
                unbanTokens.set(token, unbanItem);
                setTimeout(liftBan, banTimeout, unbanItem);
                
                if (isBot) {
                    client.say(message.nickname, 'You have been suspected of being a spam bot and been banned from the following channels: ');
                    client.say(message.nickname, Array.from(participatingChannels).join(', '));
                    client.say(message.nickname, `If you are not a bot, please reply to this message with "$unbanme ${token}" and rejoin.`);
                    client.say(message.nickname, 'The ban will be lifted automatically in 6h.');
                }

                client.say('Cu3PO42', `${message.nickname} has been automatically banned for posting the following message in ${message.channel}.`);
                client.say('Cu3PO42', `They are ${isBot ? '' : 'not '}being suspected of being a bot.`);
                client.say('Cu3PO42', message.message);

                for (const channel of participatingChannels) {
                    kick(channel, message.nickname, 'You have been suspected of spamming.');
                    ban(channel, hostmask);
                }
            },

            '367'(message: Tennu.Message367) {
                const channel = message.channel.toLowerCase();
                const resolver = banlistPromiseResolver.get(channel);
                if (resolver === undefined) return;

                resolver.inProgress.push({
                    channel,
                    hostmask: message.hostmaskPattern,
                    setBy: message.setter,
                    timestamp: message.timestamp,
                });
            },

            '368'(message: Tennu.Message) {
                const channel = message.params[1].toLowerCase();
                const resolver = banlistPromiseResolver.get(channel);
                if (resolver === undefined) return;

                resolver.resolve(resolver.inProgress);
                banlistPromiseResolver.delete(channel);
            },

            '!unbanme'(command: Tennu.Command) {
                const token = unbanTokens.get(command.args[0]);
                if (token === undefined) {
                    client.say(command.nickname, 'Sorry, this is not a valid unban code.');
                    return;
                }
                
                client.say('Cu3PO42', `${command.nickname} has triggered a manual unban!`);
                liftBan(token);
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

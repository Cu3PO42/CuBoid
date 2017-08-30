import { createPool } from "mysql";
import * as moment from "moment";
import * as _ from "lodash";
import * as util from "util";
import * as Tennu from "tennu";

interface StoredMessage {
    from_user: string;
    to_user: string;
    time: Date;
    message: string;
}

// TODO Add delayed tell

interface Resolver<T> {
    resolve(e: T): void;
    reject(err: Error): void;
    promise: Promise<T>;
}

function defer<T>() {
    let res: Resolver<T> = {} as Resolver<T>;
    res.promise = new Promise((resolve, reject) => {
        res.resolve = resolve;
        res.reject = reject;
    });
    return res;
}

export function init(client: Tennu.Client, imports: Tennu.PluginImports) {
    var pool = createPool(client.config("tell-database")),
        messageExtractor = /.tell\s*\S+\s*(.*)$/;

    client._socket.on("close", () => {
        pool.end(_.noop);
    });

    async function execSql(statement: string, ...params: string[]) {
        return await new Promise((resolve, reject) => {
            pool.getConnection((err, conn) => {
                if (err) reject(err);
                conn.query(statement, params, (err, res) => {
                    if (err) reject(err);
                    conn.release();
                    resolve(res);
                });
            })
        }) as Promise<any[]>;
    }

    let messageCache = new Map<string, boolean>();
    let cacheSize = 0;
    const MAX_CACHE_SIZE = 500;

    function setCachedValue(user: string, val: boolean) {
        if (cacheSize++ === MAX_CACHE_SIZE) {
            cacheSize = 1;
            messageCache = new Map<string, boolean>();
        }

        messageCache.set(user, val);
    }

    async function checkMessagesForUser(user: string) {
        const messages = await execSql("SELECT * FROM messages WHERE to_user = ?", user);
        if (messages.length) {
            if (await confirmReceive(user)) {
                execSql("DELETE FROM messages WHERE to_user = ?", user);
                client.say(user, _.map(messages, (e) => { return util.format("%s: %s said %s to tell you: %s", user, e.from_user, moment(e.time).fromNow(), e.message); }))
                setCachedValue(user, false);
            } else {
                setCachedValue(user, true);
            }
        } else {
            setCachedValue(user, false);
        }
    }


    var registeredResolvers: { [nick: string]: Resolver<boolean> } = {},
        nickserv: string = client.config("nickserv").toLowerCase();

    function isRegistered(name: string) {
        var deferred = defer<boolean>();
        registeredResolvers[name.toLowerCase()] = deferred;
        client.say(nickserv, "info " + name);
        return deferred.promise;
    }

    var confirmResolvers: { [nick: string]: Resolver<boolean> } = {};

    function confirmTell(name: string) {
        var deferred = defer<boolean>();
        confirmResolvers[name] = deferred;
        return deferred.promise;
    }

    var receiveResolvers: { [nick: string]: Resolver<boolean> } = {};

    function confirmReceive(name: string) {
        var deferred = defer<boolean>();
        receiveResolvers[name.toLowerCase()] = deferred;
        client.say(nickserv, "status " + name);
        return deferred.promise;
    }

    return {
        handlers: {
            "!tell": async (command: Tennu.Command) => {
                var resolver = confirmResolvers[command.nickname];
                if (resolver) {
                    resolver.resolve(false);
                    confirmResolvers[command.nickname] = undefined;
                }
                const user = await client.whois(command.nickname);
                if (!user.is_ok) {
                    return "There was a problem, please try again soon!";
                }
                if (!user.value.identified) {
                    return "You need to be identified to use this service.";
                }
                var message = command.message.match(messageExtractor)[1];
                const registered = await isRegistered(command.args[0]);
                if (!registered) {
                    client.say(command.nickname, [util.format("The user '%s' is not registered. Are you sure you want to send this message, %s?", command.args[0], command.nickname), "Please use $confirmtell to confirm or $aborttell to abort."]);
                    if (!await confirmTell(command.nickname)) {
                        return "Aborted.";
                    }
                }
                try {
                    await execSql("INSERT INTO messages (from_user, to_user, message) VALUES (?, ?, ?)", user.value.identifiedas, command.args[0], message);
                    setCachedValue(command.args[0], true);
                    return "I'll pass that on."
                } catch (e) {
                    return "Uh oh, something went wrong.";
                }
            },

            notice: (notice: Tennu.MessageNotice) => {
                if (notice.nickname && notice.nickname.toLowerCase() === nickserv) {
                    var m = notice.message.match(/^(?:Nick )?\x02?(\S+?)\x02? is(.)/);
                    if (m) {
                        var resolver = registeredResolvers[m[1].toLowerCase()];
                        if (resolver) {
                            resolver.resolve(m[2] === " ");
                            registeredResolvers[m[1].toLowerCase()] = undefined;
                        }
                    }
                    m = notice.message.match(/^STATUS (\S+) (\d)/);
                    if (m) {
                        var resolver = receiveResolvers[m[1].toLowerCase()];
                        if (resolver) {
                            resolver.resolve(m[2] !== "1");
                            receiveResolvers[m[1].toLowerCase()] = undefined;
                        }
                    }
                }
            },

            "!confirmtell": (command: Tennu.Command) => {
                var resolver = confirmResolvers[command.nickname];
                if (resolver) {
                    resolver.resolve(true);
                    confirmResolvers[command.nickname] = undefined;
                }
            },

            "!aborttell": (command: Tennu.Command) => {
                var resolver = confirmResolvers[command.nickname];
                if (resolver) {
                    resolver.resolve(false);
                    confirmResolvers[command.nickname] = undefined;
                }
            },

            privmsg: (message: Tennu.MessagePrivmsg) => {
                const cached = messageCache.get(message.nickname);
                if (cached === false) return;

                checkMessagesForUser(message.nickname);
            }
        },

        help: {
            "tell": [
                "tell <user> <message>",
                " ",
                "Forward a message to the user when they become active. Requires user to be registered.",
                "If the recipient isn't registered, the user will be asked to confirm."
            ],

            "confirmtell": [
                "Confirm that you want to send a message to an unregistered user."
            ],

            "aborttell": [
                "Abort a message pending approval to an unregistered user."
            ]
        },

        commands: ["tell", "confirmtell", "abortell"]
    };
}

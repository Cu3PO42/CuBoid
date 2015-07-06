/// <reference path="../typings/moment/moment.d.ts" />
/// <reference path="../typings/bluebird/bluebird.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/node/node.d.ts" />

import mysql = require("../mysql-bootstrap");
import moment = require("moment");
import Promise = require("bluebird");
import _ = require("lodash");
import util = require("util");

module CuBoid.Tell {
    interface StoredMessage {
        from_user: string;
        to_user: string;
        time: Date;
        message: string;
    }

    // TODO Cache database
    // TODO Add delayed tell

    export function init(client: Tennu.Client, imports: Tennu.PluginImports) {
        var pool = mysql.createPool(client.config("tell-database")),
            messageExtractor = /.tell\s*\S+\s*(.*)$/;

        client._socket.on("close", () => {
            pool.end(_.noop);
        });

        var registeredResolvers: { [nick: string]: Promise.Resolver<boolean> } = {},
            nickserv: string = client.config("nickserv").toLowerCase();

        function isRegistered(name: string): Promise<boolean> {
            var deferred = Promise.defer<boolean>();
            registeredResolvers[name.toLowerCase()] = deferred;
            client.say(nickserv, "info " + name);
            return deferred.promise;
        }

        var confirmResolvers: { [nick: string]: Promise.Resolver<boolean> } = {};

        function confirmTell(name: string): Promise<boolean> {
            var deferred = Promise.defer<boolean>();
            confirmResolvers[name] = deferred;
            return deferred.promise;
        }

        return {
            handlers: {
                "!tell": (command: Tennu.Command) => {
                    var resolver = confirmResolvers[command.nickname];
                    if (resolver) {
                        resolver.resolve(false);
                        confirmResolvers[command.nickname] = undefined;
                    }
                    return client.whois(command.nickname)
                    .then((user) => {
                        if (!user.is_ok) {
                            return "There was a problem, please try again soon!";
                        }
                        if (user.value.identified) {
                            var message = command.message.match(messageExtractor)[1];
                            return isRegistered(command.args[0])
                            .then((registered) => {
                                console.log(registered);
                                if (registered) {
                                    return true;
                                }
                                client.say(command.channel, [util.format("The user '%s' is not registered. Are you sure you want to send this message, %s?", command.args[0], command.nickname), "Please use $confirmtell to confirm or $aborttell to abort."]);
                                return confirmTell(command.nickname);
                            })
                            .then((dotell) => {
                                if (dotell) {
                                    pool.execSql("INSERT INTO messages (from_user, to_user, message) VALUES (?, ?, ?)", [user.value.identifiedas, command.args[0], message]);
                                    return "I'll pass that on."
                                }
                                return "Aborted.";
                            });
                        }
                        return "You need to be identified to use this service."
                    });
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
                    pool.execSql("SELECT * FROM messages WHERE to_user = ?", [message.nickname])
                    .then((messages: StoredMessage[]) => {
                        if (messages.length) {
                            client.whois(message.nickname)
                            .then((whois) => {
                                if (whois.is_ok && whois.value.identified && whois.value.identifiedas.toLowerCase() === message.nickname.toLowerCase()) {
                                    pool.execSql("DELETE FROM messages WHERE to_user = ?", [message.nickname]);
                                    client.say(message.nickname, _.map(messages, (e) => { return util.format("%s: %s said %s to tell you: %s", message.nickname, e.from_user, moment(e.time).fromNow(), e.message); }))
                                }
                            })
                        }
                    })
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
}

export = CuBoid.Tell;

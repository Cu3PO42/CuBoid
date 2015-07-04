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
    export function init(client: Tennu.Client, imports: Tennu.PluginImports) {
        var pool = mysql.createPool(client.config("tell-database")),
            messageExtractor = /.tell\s*\S+\s*(.*)$/;

        client._socket.on("close", () => {
            pool.end(_.noop);
        });

        var registeredResolvers: { [nick: string]: Promise.Resolver<boolean> } = {};

        function isRegistered(name: string): Promise<boolean> {
            var deferred = Promise.defer<boolean>();
            registeredResolvers[name] = deferred;
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
                    client.whois(command.nickname)
                    .then((user) => {
                        if (!user.is_ok) {
                            return "There was a problem, please try again soon!";
                        }
                        if (user.value.identified) {
                            var recipient = command.message.match(messageExtractor)[1];
                            return isRegistered(recipient)
                            .then((registered) => {
                                if (registered) {
                                    return true;
                                }
                                client.say(command.channel, [util.format("The user '%s' is not registered. Are you sure you want to send this message, %s?", recipient, command.nickname), "Please use $confirmtell to confirm or $aborttell to abort."]);
                                return confirmTell(command.nickname);
                            })
                            .then((dotell) => {
                                if (dotell) {
                                    pool.execSql("INSERT INTO messages (from_user, to_user, message) VALUES (?, ?, ?)", [user.value.identifiedas, command.args[0], recipient]);
                                    return "I'll pass that on."
                                }
                                return "Aborted.";
                            });
                        }
                        return "You need to be identified to use this service."
                    });
                },

                notice: (notice: Tennu.MessageNotice) => {
                    if (notice.nickname === "NickServ") {
                        var m = notice.message.match(/^(\S+) is(.)/);
                        if (m) {
                            var resolver = registeredResolvers[m[1]];
                            if (resolver) {
                                resolver.resolve(m[2] === " ");
                            }
                        }
                    }
                },

                "!confirmtell": (command: Tennu.Command) => {
                    var resolver = confirmResolvers[command.nickname];
                    if (resolver) {
                        resolver.resolve(true);
                    }
                },

                "!aborttell": (command: Tennu.Command) => {
                    var resolver = confirmResolvers[command.nickname];
                    if (resolver) {
                        resolver.resolve(false);
                    }
                }
            }
        };
    }
}

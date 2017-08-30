/// <reference path="../typings/tennu/tennu.d.ts"/>
import util = require("util");

export function init(client: Tennu.Client, imports: Tennu.PluginImports) {
    var requiresAdmin: Tennu.CommandHandlerProxy = imports.admin.requiresAdmin,
        storage = client.config("enabled") || {};
    return {
        handlers: {
            "!enable": requiresAdmin((command: Tennu.Command) => {
                var stored = storage[command.args[0]];
                if (stored !== undefined) {
                    stored[command.args[1].toLowerCase()] = true;
                    return util.format("Plugin %s enabled.", command.args[0]);
                }
                return util.format("Plugin %s not known.", command.args[0]);
            }),

            "!disable": requiresAdmin((command: Tennu.Command) => {
                var stored = storage[command.args[0]];
                if (stored !== undefined) {
                    stored[command.args[1].toLowerCase()] = false;
                    return util.format("Plugin %s disabled.", command.args[0]);
                }
                return util.format("Plugin %s not known.", command.args[0]);
            }),
        },

        exports: {
            getEnabler: (name: string) => {
                storage[name] = storage[name] || {};

                return <T extends Tennu.Message>(fn: Tennu.CommandHandler<T>) => {
                    return (command: T) => {
                        var stored = storage[name][command.channel.toLowerCase()];
                        if (command.isQuery || stored || stored === undefined && storage[name].default) {
                            return fn(command);
                        }
                    }
                }
            }
        },

        commands: ["enable", "disable"],

        help: {
            "enable": [
                "enable <plugin> <channel>",
                " ",
                "Enables the given plugin in the given channel. Requires admin."
            ],
            "disable": [
                "disable <plugin> <channel>",
                " ",
                "Disables the given plugin in the given channel. Requires admin."
            ]
        }
    }
}

export var requiresRoles = ["admin"];

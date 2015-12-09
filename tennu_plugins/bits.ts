/* @flow */

module CuBoid.Bits {
    export function init(client: Tennu.Client, imports: Tennu.PluginImports): Tennu.PluginExport {
        return {
            handlers: {
                "!ping": function(command) {
                    return "PONG";
                },
                "!docs": function(command) {
                    return "https://github.com/Cu3PO42/CuBoid/wiki";
                },
                "!lmlgtfyfy": function(command: Tennu.Command) {
                    return "http://lmgtfy.com/?q=" + encodeURIComponent(command.args.join(" "));
                }
            },

            help: {
                "ping": [
                    "ping",
                    " ",
                    "Responds \"PONG\" to ping."
                ],
                "docs": [
                    "docs",
                    " ",
                    "Links to the docs."
                ]
            },

            commands: ["ping", "docs"]
        };
    }
};

export = CuBoid.Bits;

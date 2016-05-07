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
                "!lmlmgtfyfy": function(command: Tennu.Command) {
                    return "http://lmgtfy.com/?q=" + encodeURIComponent(command.args.join(" "));
                },
                "!ud": function(command: Tennu.Command) {
                    return "http://urbandictionary.com/define.php?term=" + encodeURIComponent(command.args.join(" "));
                },
                "!keysave": function(command: Tennu.Command) {
                    return "https://cu3po42.gitbooks.io/keysave/content/";
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
                ],
                "lmlmgtfyfy": [
                    "lmlmgtfyfy <search term>",
                    " ",
                    "Query LMGTFY for the search term."
                ],
                "ud": [
                    "ud <search term>",
                    " ",
                    "Search Urban Dictionary for the search term."
                ]
            },

            commands: ["ping", "docs", "lmlmgtfyfy", "ud"]
        };
    }
};

export = CuBoid.Bits;

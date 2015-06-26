/* @flow */

module.exports = {
    init: function(client, imports) {
        return {
            handlers: {
                "!ping": function(command) {
                    return "PONG";
                },
                "!docs": function(command) {
                    return "https://github.com/Cu3PO42/CuBoid/wiki";
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

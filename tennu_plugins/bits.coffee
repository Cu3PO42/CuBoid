module.exports = 
    init: (client, imports) ->
        handlers:
            '!ping': (command) ->
                "PONG"

            "!docs": (command) ->
                "https://github.com/Cu3PO42/CuBoid/wiki"

        help:
            'ping': [
                'ping'
                ' '
                'Responds \"PONG\" to ping.'
            ]

            "docs": [
                "docs"
                " "
                "Links to the docs."
            ]

        commands: ['ping', "docs"]

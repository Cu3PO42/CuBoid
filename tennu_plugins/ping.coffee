module.exports = 
    init: (client, imports) ->
        handlers:
            '!ping': (command) ->
                "PONG"
        help:
            'ping': [
                'ping'
                ' '
                'Responds \"PONG\" to ping.'
            ]

        commands: ['ping']

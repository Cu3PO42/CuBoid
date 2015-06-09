module.exports = 
    init: (client, imports) ->
        handlers:
            '!ping': (command) ->
                "PONG"
        help:
            'ping': [
                'ping'
                ' '
                'Responds to ping.'
            ]
        commands: ['ping']

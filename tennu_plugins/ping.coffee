module.exports = 
    init: (client, imports) ->
        handlers:
            '!ping': (command) ->
                client.say(command.channel, "PONG")
        help:
            'ping': [
                'ping'
                ' '
                'Responds to ping.'
            ]
        commands: ['ping']

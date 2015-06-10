Message = require('../waterline-bootstrap').models.collections.messages
moment = require 'moment'
Promise = require 'bluebird'

module.exports =
    init: (client, imports) ->
        messageExtractor = /.tell\s*\S+\s*(.*)$/

        handlers:
            "!tell": (message) ->
                client.whois(message.nickname)
                .then((user) ->
                    unless user.is_ok
                        "There was a problem, please try again soon!"
                    if user.value.identified
                        Message.create(from: user.value.identifiedas, to: message.args[0], time: new Date(), message: message.message.match(messageExtractor)[1])
                        .exec((err, user) -> undefined)
                        "I'll pass that on."
                    else
                        "You need to be identified to use this service."
                )

            privmsg: (message) ->
                Message.find()
                .where(to: message.nickname)
                .then((messages) ->
                    if messages.length
                        client.whois(message.nickname)
                        .then((whois) ->
                            if whois.is_ok && whois.value.identified && whois.value.identifiedas == message.nickname
                                Message.destroy(to: message.nickname)
                                .exec((err, user) -> undefined)
                                client.say(message.nickname, "#{message.nickname}: #{msg.from} said #{moment(msg.time).fromNow()} to tell you: #{msg.message}" for msg in messages)
                        )
                )

        help:
            "tell": [
                "tell <user> <message>"
                " "
                "Forward a message to the user when they become active. Requires both parties to be identified with NickServ."
            ]
        commands: ["tell"]

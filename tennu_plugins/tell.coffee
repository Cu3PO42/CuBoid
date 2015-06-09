Message = require('../waterline-bootstrap').models.collections.messages
moment = require 'moment'

module.exports =
    init: (client, imports) ->
        messageExtractor = /.tell\s*\S+\s*(.*)$/
        handlers:
            "!tell": (message) ->
                Message.create(from: message.nickname, to: message.args[0], time: new Date(), message: message.message.match(messageExtractor)[1])
                .exec((err, user) -> undefined)
                "I'll pass that on."

            privmsg: (message) ->
                Message.find()
                .where(to: message.nickname)
                .then((messages) ->
                    Message.destroy(to: message.nickname)
                    .exec((err, user) -> undefined)
                    client.say(message.nickname, "#{message.nickname}: #{msg.from} said #{moment(msg.time).fromNow()} to tell you: #{msg.message}" for msg in messages)
                )

        help:
            "tell": [
                "tell user message"
                " "
                "Forward message to user when they become active."
            ]
        commands: ["tell"]

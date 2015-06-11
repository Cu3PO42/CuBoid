mysql = require '../mysql-bootstrap'
moment = require 'moment'
Promise = require 'bluebird'
_ = require 'lodash'

module.exports =
    init: (client, imports) ->
        pool = mysql.createPool(client.config("tell-database"))
        client._socket.on "close", ->
            pool.end(_.noop)

        messageExtractor = /.tell\s*\S+\s*(.*)$/

        handlers:
            "!tell": (message) ->
                client.whois(message.nickname)
                .then((user) ->
                    unless user.is_ok
                        "There was a problem, please try again soon!"
                    if user.value.identified
                        pool.execSql("INSERT INTO messages (from_user, to_user, message) VALUES (?, ?, ?)", [user.value.identifiedas, message.args[0], message.message.match(messageExtractor)[1]])
                        "I'll pass that on."
                    else
                        "You need to be identified to use this service."
                )

            privmsg: (message) ->
                pool.execSql("SELECT * FROM messages WHERE to_user = ?", [message.nickname])
                .then((messages) ->
                    if messages.length
                        client.whois(message.nickname)
                        .then((whois) ->
                            if whois.is_ok && whois.value.identified && whois.value.identifiedas == message.nickname
                                pool.execSql("DELETE FROM messages WHERE to_user = ?", [message.nickname])
                                client.say(message.nickname, "#{message.nickname}: #{msg.from_user} said #{moment(msg.time).fromNow()} to tell you: #{msg.message}" for msg in messages)
                        )
                )

        help:
            "tell": [
                "tell <user> <message>"
                " "
                "Forward a message to the user when they become active. Requires both parties to be identified with NickServ."
            ]
        commands: ["tell"]

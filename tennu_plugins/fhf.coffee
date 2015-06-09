_ = require 'lodash'

module.exports =
    init: (client, imports) ->
        channelMap = {}

        handlers:
            privmsg: (message) ->
                chnmp = channelMap[message.channel] = channelMap[message.channel] || {left: [], right: []}
                if message.message == "s('3')/"
                    chnmp.left.push(message.nickname)
                    setTimeout(Array::shift.bind(chnmp.left), 60000).unref()
                else if message.message == "\\('3')z"
                    chnmp.right.push(message.nickname)
                    setTimeout(Array::shift.bind(chnmp.right), 60000).unref()

                if chnmp.left.length && chnmp.right.length
                    res = "#{_.last(chnmp.left)} s('3')/\\('3')z #{_.last(chnmp.right)}"
                    chnmp.left.pop()
                    chnmp.right.pop()
                    [res, "~FABULOUS~"]
module.exports =
    init: (client, imports) ->
        channelMap = {}

        handlers:
            privmsg: (message) ->
                channelMap[message.channel] = {} unless channelMap[message.channel]
                chnmp = channelMap[message.channel]
                if message.message == "s('3')/"
                    chnmp.left = message.nickname
                else if message.message == "\\('3')z"
                    chnmp.right = message.nickname

                if chnmp.left? && chnmp.right?
                    res = "#{chnmp.left} s('3')/\\('3')z #{chnmp.right}"
                    channelMap[message.channel] = {}
                    [res, "~FABULOUS~"]
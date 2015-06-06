module.exports =
    init: (client, imports) ->
        npr = /\b[0-2]?\d(?:\s*-\s*[0-2]?\d|(?:\s*,\s*[0-2]?\d)*)\s*([\/.-])\s*(?:[0-2]?\d(?:\s*-\s*[0-2]?\d|(?:\s*,\s*[0-2]?\d)*)\s*\1\s*){4}[0-2]?\d(?:\s*-\s*[0-2]?\d|(?:\s*,\s*[0-2]?\d)*)\b/;
        handlers:
            privmsg: (message) ->
                "Not perfect, reset!" if npr.test message.message

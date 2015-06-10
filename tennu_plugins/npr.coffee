module.exports =
    init: (client, imports) ->
        enabler = imports.enable.getEnabler("npr")
        npr = /\d+(?:\s*-\s*\d+|(?:\s*,\s*\d+)*)\s*([\/.])(?:\s*\d+(?:\s*-\s*\d+|(?:\s*,\s*\d+)*)\s*\1){4}\s*\d+(?:\s*-\s*\d+|(?:\s*,\s*\d+)*)/
        groupExtractor = /(\d+)\s*$/

        handlers:
            privmsg: enabler.enabled (message) ->
                if m = message.message.match(npr)
                    groups = m[0].split(m[1])
                    for group in groups
                        max = parseInt(group.match(groupExtractor)[1])
                        if max > 31
                            return undefined
                        else if max < 30
                            res = "Not perfect, reset!"
                    res

    requires: ["enable"]


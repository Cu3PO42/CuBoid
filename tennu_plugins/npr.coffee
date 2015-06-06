module.exports =
    init: (client, imports) ->
        requiresAdmin = imports.admin.requiresAdmin
        enabler = imports.enable.getEnabler("npr")
        npr = /\b[0-2]?\d(?:\s*-\s*[0-2]?\d|(?:\s*,\s*[0-2]?\d)*)\s*([\/.-])\s*(?:[0-2]?\d(?:\s*-\s*[0-2]?\d|(?:\s*,\s*[0-2]?\d)*)\s*\1\s*){4}[0-2]?\d(?:\s*-\s*[0-2]?\d|(?:\s*,\s*[0-2]?\d)*)\b/;

        handlers:
            privmsg: enabler.enabled (message) ->
                "Not perfect, reset!" if npr.test message.message
    requires: ["enable"]
    requiresRoles: ["admin"]


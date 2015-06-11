#TODO Persist config changes
module.exports =
    init: (client, imports) ->
        requiresAdmin = imports.admin.requiresAdmin

        storage = client.config("enabled") || {}

        handlers:
            "!enable": requiresAdmin (command) ->
                stored = storage[command.args[0]]
                if stored?
                    stored[command.args[1].toLowerCase()] = true
                    "Plugin #{command.args[0]} enabled."
                else
                    "Plugin #{command.args[0]} not known."

            "!disable": requiresAdmin (command) ->
                stored = storage[command.args[0]]
                if stored?
                    stored[command.args[1].toLowerCase()] = false
                    "Plugin #{command.args[0]} disabled."
                else
                    "Plugin #{command.args[0]} not known."

        commands: ["enable", "disable"]

        help:
            "enable": [
                "enable <plugin> <channel>"
                " "
                "Enables the given plugin in the given channel. Requires admin."
            ]
            "disable": [
                "disable <plugin> <channel>"
                " "
                "Disables the given plugin in the given channel. Requires admin."
            ]

        exports:
            getEnabler: (name) ->
                storage[name] = storage[name] || {}
                enabled: (fn) ->
                    (command) ->
                        stored = storage[name][command.channel.toLowerCase()]
                        fn(command) if command.isQuery || stored || stored == undefined && storage[name].default

    requiresRoles: ["admin"]
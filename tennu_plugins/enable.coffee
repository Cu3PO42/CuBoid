module.exports =
    init: (client, imports) ->
        requiresAdmin = imports.admin.requiresAdmin

        storage = client.config("enabled") || {}

        handlers:
            "!enable": requiresAdmin (command) ->
                stored = storage[command.args[0]]
                if stored?
                    stored[command.args[1]] = true
                    "Plugin #{command.args[0]} enabled."
                else
                    "Plugin #{command.args[0]} not known."

            "!disable": requiresAdmin (command) ->
                stored = storage[command.args[0]]
                if stored?
                    stored[command.args[1]] = false
                    "Plugin #{command.args[0]} disabled."
                else
                    "Plugin #{command.args[0]} not known."

        commands: ["enable", "disable"]

        exports:
            getEnabler: (name) ->
                storage[name] = storage[name] || {}
                enabled: (fn) ->
                    (command) ->
                        stored = storage[name][command.channel]
                        fn(command) if command.isQuery || stored || stored == undefined && storage[name].default

    requiresRoles: ["admin"]
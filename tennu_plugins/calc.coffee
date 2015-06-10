mathjs = require 'mathjs'

module.exports =
    init: (client, imports) ->
        handlers:
            '!calc': (command) ->
                expr = command.args.join(" ")
                try
                    "#{expr} = #{mathjs.eval(expr)}"
                catch
                    ""
        help:
            "calc": [
                "calc <expression>"
                " "
                "Evaluates the given mathematical expression."
            ]
        commands: ['calc']
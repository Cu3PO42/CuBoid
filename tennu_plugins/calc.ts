import * as Tennu from "tennu";

export function init(client: Tennu.Client, imports: Tennu.PluginImports): Tennu.PluginExport {
    return {
        handlers: {
            "!calc": function(command: Tennu.Command) {
                return "!calc is disabled for the time being due to remote code execution vulnerabilities :(";
                /*var expr = command.args.join(" ");
                try {
                    return expr + " = " + mathjs.eval(expr);
                } catch (e) {
                }*/
            }
        },

        help: {
            "calc": [
                "calc <expression>",
                " ",
                "Evaluates the given mathematical expression."
            ]
        },

        commands: ["calc"]
    }
}

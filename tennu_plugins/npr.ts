export function init(client: Tennu.Client, imports: Tennu.PluginImports) {
    var enabler:Tennu.CommandHandlerProxy = imports.enable.getEnabler("npr"),
        test = [1,2,3],
        nprRegex = /\d+(?:\s*-\s*\d+|(?:\s*,\s*\d+)*)\s*([\/.])(?:\s*\d+(?:\s*-\s*\d+|(?:\s*,\s*\d+)*)\s*\1){4}\s*\d+(?:\s*-\s*\d+|(?:\s*,\s*\d+)*)/,
        groupExtractor = /(\d+)\s*$/;

    return {
        handlers: {
            privmsg: enabler((message: Tennu.MessagePrivmsg) => {
                var m = message.message.match(nprRegex),
                    res: string;
                if (m) {
                    var groups = m[0].split(m[1]);
                    for (let i = 0; i < groups.length; i++) {
                        let max = parseInt(groups[i].match(groupExtractor)[1]);
                        if (max > 31) {
                            return undefined;
                        } else if (max < 30) {
                            res = "Not perfect, reset.";
                        }
                    }
                    return res;
                }
            })
        }
    }
}

export var requires = ["enable"];

declare module Tennu {
    interface Client {

    }

    interface Message {
        prefix: string;
        command: string;
        params: Array<any>; // TODO: find out whatever this is an array of
        tags: any; // TODO: find out type. probably an array?
        hostmask: {
            nickname: string;
            username: string;
            hostname: string;
        };
        nickname: string;
        channel: string;
    }

    interface MessagePrivmsgNotice extends Message {
        isQuery: boolean;
        channel: string;
        message: string;
    }

    interface MessagePartQuit extends Message {
        reason: string;
    }

    interface MessageKick extends Message {
        kicked: string;
        kicker: string;
    }

    interface MessageNick extends Message {
        old: string;
        new: string;
    }

    interface MessageMode extends Message {
        modestring: string;
        args: any // TODO Figure this type out
    }

    // TODO: Add all the numeric messages.

    interface Command extends Message {
        args: Array<string>;
    }

    interface PluginImports {

    } // TODO Document imports.

    interface PluginExport {

    } // TODO Document exports.
}

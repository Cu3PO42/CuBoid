declare module Tennu {
    declare class Client extends any {

    }

    declare class Message {
        prefix: string;
        command: string;
        params: Array<any>; // TODO: find out whatever this is an array of
        tags: any; // TODO: find out type. probably an array?
        hostmask: ?{
            nickname: string;
            username: string;
            hostname: string;
        };
        nickname?: string; // TODO: Could also be nullable?
        channel: string;
    }

    declare class MessagePrivmsgNotice extends Message {
        isQuery: boolean;
        channel: string;
        message: string;
    }

    declare class MessagePartQuit extends Message {
        reason: string;
    }

    declare class MessageKick extends Message {
        kicked: string;
        kicker: string;
    }

    declare class MessageNick extends Message {
        old: string;
        new: string;
    }

    declare class MessageMode extends Message {
        modestring: string;
        args: any // TODO Figure this type out
    }

    // TODO: Add all the numeric messages.

    declare class Command extends Message {
        args: Array<string>;
    }

    declare class PluginImports extends any {

    } // TODO Document imports.

    declare class PluginExport extends any {

    } // TODO Document exports.
}

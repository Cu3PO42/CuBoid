declare module Tennu {
    interface Client {
        config(key: string): any;
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
        isQuery: boolean; // I'd rather not rely on type checks at runtime :/
    }

    interface MessagePrivmsgNotice extends Message {
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

    type PluginImports = any;

    type PluginExport = any;

    type Reply = string|string[];
    type CommandHandler<T> = <T extends Message>(c: T) => Reply
    type CommandHandlerProxy<T> = <T>(h: CommandHandler<T>) => CommandHandler<T>;
}

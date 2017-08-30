declare namespace Tennu {
    interface Client {
        whois(user: string): Promise<{
            is_ok: boolean;
            value: {
                identified: boolean;
                identifiedas: string;
            }
        }>;
        say(channel: string, msg: Reply): void;
        config(key: string): any;
        _socket: any;
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

    interface MessagePrivmsg extends Message {
        channel: string;
        message: string;
    }

    type MessageNotice = MessagePrivmsg;

    interface MessagePart extends Message {
        reason: string;
    }

    type MessageQuit = MessagePart;

    type MessageJoin = Message;

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
        message: string;
    }

    type PluginImports = any;

    type PluginExport = any;

    type Reply = string|string[]|Promise<string|string[]>;
    type CommandHandler<T extends Message> = (c: T) => Reply
    type CommandHandlerProxy = <T extends Message>(h: CommandHandler<T>) => CommandHandler<T>;
}

declare module "tennu" {
    export = Tennu;
}
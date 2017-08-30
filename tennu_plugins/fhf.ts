/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/tennu/tennu.d.ts"/>
import _ = require("lodash");

export function init(client: Tennu.Client, imports: Tennu.PluginImports) {
    var channelMap:{ [channel: string]: { left: string[], right: string[] }} = {};

    return {
        handlers: {
            privmsg: (message: Tennu.MessagePrivmsg) => {
                if (message.message === "s('3')/") {
                    var chnmp = channelMap[message.channel] = channelMap[message.channel] || { left: [], right: [] };
                    if (chnmp.right.length) {
                        return [message.nickname + " s('3')/\\('3')z " + chnmp.right.pop(), "~FABULOUS~"];
                    } else {
                        chnmp.left.push(message.nickname);
                        setTimeout(Array.prototype.shift.bind(chnmp.left), 60000);
                    }
                } else if (message.message === "\\('3')z") {
                    var chnmp = channelMap[message.channel] = channelMap[message.channel] || { left: [], right: [] };
                    if (chnmp.left.length) {
                        return [chnmp.left.pop() + " s('3')/\\('3')z " + message.nickname, "~FABULOUS~"];
                    } else {
                        chnmp.right.push(message.nickname);
                        setTimeout(Array.prototype.shift.bind(chnmp.right), 60000);
                    }
                }
            }
        }
    }
}

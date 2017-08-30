/// <reference path="../typings/tennu/tennu.d.ts" />

import _ = require("lodash");
import moment = require("moment");
import util = require("util");
import Data = require("../pokemonTypes");

export function init(client: Tennu.Client, imports: Tennu.PluginImports) {
    interface TypegameCache {
        [channel: string]: {
            running: boolean;
            type?: number;
            types?: string[];
            guessed?: { [pokemon: string]: boolean; };
            userCount?: { [nick: string]: number };
            max?: number;
            cnt?: number;
        }
    }

    interface ScrambleCache {
        [channel: string]: {
            running: boolean;
            name?: string;
            scrambled?: string;
            end?: moment.Moment;
        }
    }

    var leaderKey: string = client.config("command-trigger"),
        enabler: Tennu.CommandHandlerProxy = imports.enable.getEnabler("typegame"),
        typegameCache: TypegameCache = {},
        scrambleCache: ScrambleCache = {},
        runningCache: string[] = [];

    function guessType(channel: string, nick: string, guess: string) {
        var cache = typegameCache[channel] = typegameCache[channel] || { running: false },
            guess = guess.toLowerCase();

        if (cache.running) {
            var pk = Data.pokemon_dict[guess];
            if (pk !== undefined) {
                var type = _.reduce(_.map(pk.types, (t) => { return 1 << Data.types[t]; }), (a: number, b: number) => { return a|b; })
                if (type&~cache.type && type&cache.type && (type|cache.type)==type || type==cache.type) {
                    if (!cache.guessed[guess]) {
                        cache.guessed[guess] = true;
                        var cnt = cache.userCount[nick] = cache.userCount[nick] + 1 || 1
                        if (cnt == cache.cnt) {
                            cache.running = false;
                            _.remove(runningCache[channel], (e) => { return e === "typegame"; });
                            return util.format("Correct! %s wins this round!", nick);
                        } else if (_.size(cache.guessed) === cache.max) {
                            var maxUsers = [{name: "", count: 0}];
                            for (let name in cache.userCount) {
                                let count = cache.userCount[name];
                                if (count > maxUsers[0].count) {
                                    maxUsers = [{name: name, count: count}];
                                } else if (count === maxUsers[0].count) {
                                    maxUsers.push({name: name, count: count});
                                }
                            }
                            cache.running = false;
                            _.remove(runningCache[channel], (e) => { return e === "typegame"; });
                            return util.format("Correct! All possible guesses made. %s win%s with %d guesses.",
                                                _.map(maxUsers, "name").join(", "),
                                                maxUsers.length === 1 ? "s": "",
                                                maxUsers[0].count
                            );
                        } else {
                            return "Correct!";
                        }
                    }
                } else {
                    return util.format("Sorry, %s has type %s.", pk.name, pk.types.join("/"));
                }
            }
        } else {
            return "Sorry, a game is not currently running."
        }
    }

    function guessScramble(channel: string, nick:string, guess:string) {
        var cache = scrambleCache[channel] = scrambleCache[channel] || { running: false };

        if (cache.running) {
            if (guess.toLowerCase() === cache.name.toLowerCase()) {
                cache.running = false;
                _.remove(runningCache[channel], (e) => { return e === "scramble"; });
                return util.format("Correct! %s wins this round.", nick);
            } else if (Data.pokemon_dict[guess.toLowerCase()]) {
                return "Sorry, that's not right."
            }
        } else {
            return "Sorry, a game is not currently running."
        }
    }

    return {
        handlers: {
            "!typegame": enabler((command: Tennu.Command) => {
                var cache = typegameCache[command.channel] = typegameCache[command.channel] || { running: false };
                if (typegameCache[command.channel].running) {
                    return util.format("A game is still running! Name %s Pokémon with the type %s!", cache.cnt, cache.types.join("/"));
                } else {
                    (runningCache[command.channel] = runningCache[command.channel] || []).push("typegame")
                    var {type, cnt} = _.sample(Data.type_count_array);
                    console.log(cnt);
                    cache = typegameCache[command.channel] = {
                        running: true,
                        type: type,
                        cnt: _.random(1, _.min([5, cnt])),
                        max: cnt,
                        userCount: {},
                        guessed: {},
                        types: []
                    };
                    for (var i = 0; type; type >>= 1, ++i) {
                        if (type&1)
                            cache.types.push(Data.type_list[i]);
                    }
                    return util.format("Name %s Pokémon with the type %s!",
                                        cache.cnt, cache.types.join("/")
                    );
                }
            }),

            "!scramble": enabler((command: Tennu.Command) => {
                var cache = scrambleCache[command.channel] = scrambleCache[command.channel] || { running: false };
                if (cache.running) {
                    return "A game is still running. Unsramble this name: " + cache.scrambled;
                } else {
                    (runningCache[command.channel] = runningCache[command.channel] || []).push("scramble")
                    var name = _.sample(Data.pokemon_array).name;
                    cache = scrambleCache[command.channel] = {
                        running: true,
                        name: name,
                        scrambled: _.shuffle(name.toUpperCase()).join(" "),
                        end: moment()
                    }
                    cache.end.add(3, "m")
                    return "Unscramble this name: " + cache.scrambled;
                }
            }),

            "!guess": enabler((command: Tennu.Command) => {
                if (command.args.length > 0) {
                    return guessType(command.channel, command.nickname, command.args.join(" "));
                }
            }),

            "!unscramble": enabler((command: Tennu.Command) => {
                if (command.args.length > 0) {
                    return guessScramble(command.channel, command.nickname, command.args.join(" "));
                }
            }),

            "!solvescramble": enabler((command: Tennu.Command) => {
                var cache = scrambleCache[command.channel] = scrambleCache[command.channel] || { running: false };
                if (cache.running) {
                    var now = moment();
                    if (now.isAfter(cache.end)) {
                        cache.running = false;
                        _.remove(runningCache[command.channel], (e) => { return e === "scramble"; });
                        return util.format("The result is %s.", cache.name);
                    } else {
                        return util.format("I will solve this scramble %s.", now.to(cache.end));
                    }
                }
            }),

            privmsg: enabler((message: Tennu.MessagePrivmsg) => {
                var trimmed = message.message.trim().replace(/ +/, " ");
                if (trimmed.charAt(0) !== leaderKey) {
                    var rcache = runningCache[message.channel];
                    switch(_.last(rcache)) {
                        case "typegame":
                            return guessType(message.channel, message.nickname, trimmed);
                        case "scramble":
                            return guessScramble(message.channel, message.nickname, trimmed);
                    }
                }
            })
        },

        help: {
            "typegame": [
                "typegame",
                " ",
                "Starts a new round of 'typegame'. Enter your guesses in the channel or use the guess command."
            ],

            "scramble": [
                "scramble",
                " ",
                "Starts a new round of the 'scramble' game. Unscramble the name and enter the result in the channel or use the unscramble command."
            ],

            "guess": [
                "guess <guess>",
                " ",
                "Make the given guess for the currently runnig 'typegame' round."
            ],

            "unscramble": [
                "unscramble <guess>",
                " ",
                "Make the given guess for the currently running 'scramble' round."
            ],

            "solvescramble": [
                "solvescramble",
                " ",
                "Solve the current scramble game. Becomes available 3 minustes after scramble was started.",
            ]
        },

        commands: ["typegame", "scramble", "guess", "unscramble", "solvescramble"]
    }
}

export var requires = ["enable"];

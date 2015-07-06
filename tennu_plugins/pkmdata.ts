/// <reference path="../typings/tennu/tennu.d.ts" />
/// <reference path="../typings/bluebird/bluebird.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/node/node.d.ts" />

import mysql = require("../mysql-bootstrap");
import Promise = require("bluebird");
import _ = require("lodash");
import util = require("util");
import fs = require("fs");

module CuBoid.Pkmdata {
    export function init(client: Tennu.Client, imports: Tennu.PluginImports) {
        var pool = mysql.createPool(client.config("veekun"));
        client._socket.on("close", () => {
            pool.end(_.noop);
        });

        var fileList = fs.readdirSync("./pkmdata");
        var sqlQueries: { [name: string]: string } = {};
        for (let i = 0; i < fileList.length; i++) {
            sqlQueries[fileList[i].split(".")[0]] = fs.readFileSync("./pkmdata/" + fileList[i], {encoding: "utf-8"});
        }

        interface MoveIdName {
            move_id: number;
            name: string;
        }

        function getMoveIdName(name: string): Promise<MoveIdName[]> {
            return pool.execSql(sqlQueries["moveIdName"], [name]);
        }

        interface SpeciesIdName {
            pokemon_species_id: number;
            name: string;
        }

        function getSpeciesIdName(name: string): Promise<SpeciesIdName[]> {
            return pool.execSql(sqlQueries["speciesIdName"], [name]);
        }

        function getPreviousEvolution(id: number): Promise<{evolves_from_species_id: number, name: string}[]> {
            return pool.execSql(sqlQueries["previousEvolution"], [id]);
        }

        interface LearnMethod {
            name: string;
            pokemonname: string;
            method_string: string;
        }

        interface LearnMethods {
            [name: string]: LearnMethod;
        }

        function getLearnMethods(moveid: number, pokemonid: number, pokemonname: string) {
            return pool.execSql(sqlQueries["learnMethods"], [pokemonname, moveid, pokemonid])
            .then((rows: LearnMethod[]) => {
                return _.indexBy(rows, "name");
            })
        }

        function getAbilityInfo(name: string): Promise<{name: string; effect: string;}[]> {
            return pool.execSql(sqlQueries["abilityInfo"], [name]);
        }

        interface MoveData {
            move_name: string;
            damage_class: number;
            type_name: string;
            power: number;
            accurary: number;
            pp: number;
            priority: number;
            short_effect: string;
            meta_category_id: number;
            ailment_chance: number;
            flinch_chance: number;
            stat_chance: number;
            target: string;
        }

        function getMoveData(name: string): Promise<MoveData[]> {
            return pool.execSql(sqlQueries["moveData"], [name]);
        }

        type PokemonTypes = {name: string;}[]

        function getPokemonTypes(id: number): Promise<PokemonTypes> {
            return pool.execSql(sqlQueries["pokemonTypes"], [id]);
        }

        function getPokemonTypesByName(name: string): Promise<PokemonTypes> {
            return pool.execSql(sqlQueries["pokemonTypesByName"], [name]);
        }

        interface PokemonBaseStats {
            name: string;
            species_id: number;
            hp: number;
            atk: number;
            def: number;
            spatk: number;
            spdef: number;
            spd: number;
        }

        function getPokemonBaseStats(name: string): Promise<PokemonBaseStats[]> {
            return pool.execSql(sqlQueries["pokemonBaseStats"], [name]);
        }

        type PokemonAbilities = {name: string; is_hidden: number; slot: number; }[];

        function getPokemonAbilities(id: number): Promise<PokemonAbilities> {
            return pool.execSql(sqlQueries["pokemonAbilities"], [id]);
        }

        interface NatureModifiers {
            increased_stat_id: number;
            decreased_stat_id: number;
        }

        function getNatureModifiers(name: string): Promise<NatureModifiers[]> {
            return pool.execSql(sqlQueries["natureModifiers"], [name]);
        }

        function getEggdata(name: string): Promise<{species_id: number; name: string; gender_rate: number; hatch_counter: number;}[]> {
            return pool.execSql(sqlQueries["eggdata"], [name]);
        }

        type PokemonEggGroups = {name: string;}[];

        function getPokemonEggGroups(id: number): Promise<PokemonEggGroups> {
            return pool.execSql(sqlQueries["pokemonEggGroups"], [id]);
        }

        function getTypesEfficiency(types: string[]): Promise<{name: string; damage_factor: number}[]> {
            if (types.length === 1) {
                return pool.execSql(sqlQueries["typesEfficiencyOne"], types);
            } else {
                return pool.execSql(sqlQueries["typesEfficiencyTwo"], types);
            }
        }

        function getTypeEfficiency(types: string[]): Promise<{name_one: string; name_two: string; damage_factor: number;}[]> {
            return pool.execSql(sqlQueries["typeEfficiency"], types);
        }

        function getAllLearnMethods(moveid: number, speciesid: number, speciesname: string): Promise<LearnMethods> {
            return Promise.join(getLearnMethods(moveid, speciesid, speciesname),
                getPreviousEvolution(speciesid)
                .then((previous) => {
                    if (previous[0].evolves_from_species_id > 0) {
                        return getAllLearnMethods(moveid, previous[0].evolves_from_species_id, previous[0].name);
                    } else {
                        return {};
                    }
            })).spread((methods_one, methods_two) => {
                return _.defaults<any, LearnMethods>(methods_one, methods_two);
            });
        }

        function parseDescription(description: string) {
            return description.replace(/\[([^\]]*)\]\{\w+:([^}]*)\}/g, (match, one: string, two: string, offset: number, string: string) => {
                if (one !== "") {
                    return one;
                } else {
                    return _.map(two.split("-"), _.capitalize).join(" ");
                }
            });
        }

        function parseMoveDescription(move: MoveData) {
            return parseDescription(move.short_effect).replace(/\$effect_chance%/, (match, one, offset, string) => {
                switch(move.meta_category_id) {
                    case 2:
                    case 6:
                    case 7:
                    case 13:
                        return move.stat_chance + "%";
                    case 4:
                        return move.ailment_chance + "%";
                    case 0:
                        return (move.ailment_chance || move.flinch_chance) + "%";
                }
            });
        }

        function calcStat(base: number, ev: number, num: number, level: number, increased: number, decreased: number) {
            var ev = ev || 0;
            return Math.floor((Math.floor((31 + 2*base + Math.floor(ev/4)) * level/100) + 5) * (1 + (increased === num ? 0.1 : 0) - (decreased === num ? 0.1 : 0)));
        }

        return {
            handlers: {
                "!learn": (command: Tennu.Command) => {
                    var joined = command.args.join(" ");
                    return Promise.join<any>(getMoveIdName(joined), getSpeciesIdName(joined))
                    .spread((moveid: MoveIdName[], pokemonid: SpeciesIdName[]) => {
                        if (moveid.length === 0) {
                            return util.format("'%s' does not end in a valid move!", joined);
                        } else if (pokemonid.length === 0) {
                            return util.format("'%s' does not begin with a valid Pokémon!", joined);
                        } else {
                            return getAllLearnMethods(moveid[0].move_id, pokemonid[0].pokemon_species_id, pokemonid[0].name)
                            .then((methods) => {
                                if (!_.isEmpty(methods)) {
                                    var methodString = _.map(methods, (e) => {
                                        return util.format("\x02%s\x02 %s%s",
                                            e.name,
                                            e.method_string,
                                            e.pokemonname !== pokemonid[0].name ? " as " + e.pokemonname : "");
                                    }).join("; via ");
                                    return util.format("%s can learn %s via %s.", pokemonid[0].name, moveid[0].name, methodString).match(/.{1,400}(?: |$)/g);
                                } else {
                                    return util.format("%s cannot learn %s.", pokemonid[0].name, moveid[0].name);
                                }
                            });
                        }
                    })
                },

                "!ability": (command: Tennu.Command) => {
                    var ability = command.args.join(" ");
                    return getAbilityInfo(ability)
                    .then((rows) => {
                        if (rows.length > 0) {
                            var e = rows[0],
                                res = parseDescription(e.effect).split("\n");
                            res[0] = util.format("%s: %s", e.name, res[0]);
                            return res;
                        } else {
                            return util.format("'%s' is not a valid ability.", ability);
                        }
                    });
                },

                "!move": (command: Tennu.Command) => {
                    var movename = command.args.join(" ");
                    return getMoveData(movename)
                    .then((rows) => {
                        if (rows.length > 0) {
                            var e = rows[0];
                            return [
                                util.format("[%s] Category: %s | Type: %s | Priority: %d | Target: %s | BP: %s | Acc: %s | PP: %d (%d)",
                                    e.move_name,
                                    _.capitalize(e.damage_class.toString()),
                                    e.type_name,
                                    e.priority,
                                    e.target,
                                    e.power ? e.power.toString() : "--",
                                    e.accurary ? e.accurary + "%" : "--",
                                    e.pp,
                                    e.pp * 8 / 5
                                ), parseMoveDescription(e)
                            ]
                        } else {
                            return util.format("'%s' is not a valid move.", movename);
                        }
                    })
                },

                "!stats": (command: Tennu.Command) => {
                    var joined = command.args.join(" ");

                    return Promise.join<any>(getPokemonBaseStats(joined), getNatureModifiers(joined))
                    .spread((pokemon: PokemonBaseStats[], nature: NatureModifiers[]) => {
                        if (pokemon.length > 0) {
                            var e = pokemon[0],
                                m = command.message.match(/(?:lvl|level)\s*(\d+)/i),
                                level: number = undefined,
                                evs: any = {},
                                types = getPokemonTypes(e.species_id);

                            if (m) {
                                level = parseInt(m[1]);
                            }

                            while (m = /(\d+)\s*(hp|atk|def|spatk|spdef|spd)/ig.exec(command.message)) {
                                evs[m[2]] = parseInt(m[1]);
                            }

                            if (level === undefined && _.isEmpty(evs) && !nature.length) {
                                return Promise.join(types, getPokemonAbilities(e.species_id))
                                .spread((types: PokemonTypes, abilities: PokemonAbilities) => {
                                    return util.format("%s: (%s) %d/%d/%d/%d/%d/%d %s | BST: %d",
                                        e.name,
                                        _.map(types, "name").join("/"),
                                        e.hp,
                                        e.atk,
                                        e.def,
                                        e.spatk,
                                        e.spdef,
                                        e.spd,
                                        _.map(abilities, (a) => { return util.format("[%s] %s", a.is_hidden ? "HA" : (a.slot - 1).toString(), a.name)}).join(" "),
                                        e.hp + e.atk + e.def + e.spatk + e.spdef + e.spd
                                    );
                                })
                            } else {
                                return types
                                .then((types) => {
                                    var increased_stat = 2, decreased_stat = 2;
                                    if (level === undefined)
                                        level = 100;
                                    if (nature.length) {
                                        increased_stat = nature[0].increased_stat_id;
                                        decreased_stat = nature[0].decreased_stat_id;
                                    }

                                    return util.format("%s: (%s) %d/%d/%d/%d/%d/%d",
                                        e.name,
                                        _.map(types, "name").join("/"),
                                        Math.floor((31 + 2*e.hp + Math.floor((evs.hp || 0)/4)) * level/100) + 10 + level,
                                        calcStat(e.atk, evs.atk, 2, level, increased_stat, decreased_stat),
                                        calcStat(e.def, evs.def, 3, level, increased_stat, decreased_stat),
                                        calcStat(e.spatk, evs.spatk, 4, level, increased_stat, decreased_stat),
                                        calcStat(e.spdef, evs.spdef, 5, level, increased_stat, decreased_stat),
                                        calcStat(e.spd, evs.spd, 6, level, increased_stat, decreased_stat)
                                    );
                                })
                            }
                        } else {
                            return util.format("'%s' does not begin with a valid Pokémon.", joined);
                        }
                    })
                },

                "!eggdata": (command: Tennu.Command) => {
                    var joined = command.args.join(" ");
                    return getEggdata(joined)
                    .then((rows) => {
                        var e = rows[0];
                        if (rows.length) {
                            return Promise.join(getPokemonAbilities(e.species_id), getPokemonEggGroups(e.species_id))
                            .spread((abilities: PokemonAbilities, eggGroups: PokemonEggGroups) => {
                                var partitionedAbilities = _.partition(abilities, "is_hidden");
                                return util.format("%s: [Gender] %s | [Hatch Cycles] %s | [Egg Groups] %s | [Abilities] %s %s",
                                    e.name,
                                    e.gender_rate !== -1 ? util.format("%d%% M, %d%% F", 100-e.gender_rate*12.5, e.gender_rate*12.5) : "Genderless",
                                    e.hatch_counter * 256,
                                    _.map(eggGroups, "name").join("/"),
                                    _.map(partitionedAbilities[1], "name").join("/"),
                                    partitionedAbilities[0].length ? "DW: " + partitionedAbilities[0][0].name : ""
                                );
                            })
                        } else {
                            return util.format("'%s' is not a valid Pokémon.", joined);
                        }
                    });
                },

                "!type": (command: Tennu.Command): Tennu.Reply => {
                    switch (command.args.length) {
                        case 0:
                            return "Please specify at least one type.";
                        case 1:
                        case 2:
                            return getTypesEfficiency(command.args)
                            .then((rows) => {
                                if (rows.length) {
                                    return rows;
                                }
                                else {
                                    return getPokemonTypesByName(command.args.join(" "))
                                    .then((rows) => {
                                        return getTypesEfficiency(_.map<{name: string}, string>(rows, "name"));
                                    })
                                }
                            })
                            .then((rows) => {
                                var sorted = _.groupBy(rows, "damage_factor"),
                                    res: string[] = [];
                                if (sorted[400] !== undefined) res.push("4x weak to: " + _.map(sorted[400], "name").join(", "));
                                if (sorted[200] !== undefined) res.push("2x weak to: " + _.map(sorted[200], "name").join(", "));
                                if (sorted[25] !== undefined) res.push("4x resistant against: " + _.map(sorted[25], "name").join(", "));
                                if (sorted[50] !== undefined) res.push("2x resistant against: " + _.map(sorted[50], "name").join(", "));
                                if (sorted[0] !== undefined) res.push("completely resistant against: " + _.map(sorted[0], "name").join(", "));
                                return res.join("; ");
                            });
                        default:
                            return "Please specify no more than two types.";
                    }
                },

                "!types": (command: Tennu.Command) => {
                    if (command.args.length == 2) {
                        return getTypeEfficiency(command.args)
                        .then((rows) => {
                            var e = rows[0],
                                damageTypes = {
                                    0: "no",
                                    50: "not very effective",
                                    100: "neutral",
                                    200: "super effective"
                                };
                                return util.format("%s deals %s damage against %s.", e.name_one, damageTypes[e.damage_factor], e.name_two);
                        });
                    }
                }
            },

            help: {
                "learn": [
                    "learn <pokemon> <move>",
                    " ",
                    "Will tell you if and how a Pokémon can learn a move.",
                    "Unfortunately the underlying database does not contain information about Event only moves.",
                    "False negatives are possible in that case."
                ],

                "ability": [
                    "ability <ability>",
                    " ",
                    "Return information about the given ability."
                ],

                "move": [
                    "move <move>",
                    " ",
                    "Return the move's stats and a description."
                ],

                "stats": [
                    "stats <pokemon> [additional parameters]",
                    " ",
                    "If no additional parameters are given, return type, base stats and ability of the given Pokemon.",
                    "If addition parameters are given, i.e. the level (in the form 'lvl 100'), the nature and the EVs (in the form '100 (hp|atk|def|spatk|spdef)'), the actual stats are calculated."
                ],

                "eggdata": [
                    "eggdata <pokemon>",
                    " ",
                    "Return data such as hatch cycles, gender ratio and abilities."
                ],

                "type": [
                    "type <type> [type]",
                    "type <pokemon>",
                    " ",
                    "You can specify either one or two types or a single Pokemon.",
                    "Return a list of what types are effective, not very effective, etc. against the given types or Pokemon."
                ],

                "types": [
                    "types <type> <type>",
                    " ",
                    "Return if the first type deals neutral, super effective, ... damage against the second."
                ]
            },

            commands: ["learn", "ability", "move", "stats", "eggdata", "type", "types"]
       }
    }
}

export = CuBoid.Pkmdata;

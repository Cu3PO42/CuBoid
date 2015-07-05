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

        function getPokemonTypes(id: number): Promise<{name: string;}[]> {
            return pool.execSql(sqlQueries["pokemonTypes"], [id]);
        }

        function getPokemonTypesByName(name: string): Promise<{name: string;}[]> {
            return pool.execSql(sqlQueries["pokemonTypesByName"], [name]);
        }

        function getPokemonAbilities(id: number): Promise<{name: string; is_hidden: number; slot: number}[]> {
            return pool.execSql(sqlQueries["pokemonAbilities"], [id]);
        }

        function getNatureModifiers(name: string): Promise<{increased_stat_id: number; decreased_stat_id: number}[]> {
            return pool.execSql(sqlQueries["natureModifiers"], [name]);
        }

        function getEggdata(name: string): Promise<{species_id: number; name: string; gender_rate: number; hatch_counter: number;}[]> {
            return pool.execSql(sqlQueries["eggdata"], [name]);
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
                                    return util.format("%s can learn %s via %s.", pokemonid[0].name, moveid[0].name, methodString).match(/.{1, 400}(?: |$)/g);
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
                }
            }
        }
    }
}

export = CuBoid.Pkmdata;

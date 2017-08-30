import { createPool, IPool } from "mysql";
import * as pokemonGl from "../pkmdata/pokemonGl";
import * as _ from "lodash";
import * as util from "util";
import * as fs from "fs";
import Table = require("easy-table");
import * as Tennu from "tennu";
import { CachedPromise, promisify } from "../util";

const readdir = promisify(fs.readdir),
      readFile = promisify(fs.readFile as
        (path: string, options: { encoding?: string; flag?: string; } | undefined | null,
         callback: (err: NodeJS.ErrnoException, data: string) => void) => void);

let conn: CachedPromise<{ pool: IPool, sqlQueries: { [name: string]: string } }>;

async function execSql(queryName: string, ...params: (number | string)[]) {
    const { pool, sqlQueries } = await conn.value();
    return await new Promise((resolve, reject) => {
        pool.getConnection((err, conn) => {
            if (err) reject(err);
            conn.query(sqlQueries[queryName] || queryName, params, (err, res) => {
                if (err) reject(err);
                resolve(res);
            });
        })
    }) as Promise<any[]>;
}

export function init(client: Tennu.Client, imports: Tennu.PluginImports) {
    var pool = createPool(client.config("veekun"));
    client._socket.on("close", () => {
        pool.end(_.noop);
    });
    conn = new CachedPromise(async () => {
        const fileList = await readdir("./pkmdata/sql");
        const sqlQueries: { [name: string]: string } = {};
        for (let i = 0; i < fileList.length; i++) {
            sqlQueries[fileList[i].split(".")[0]] = await readFile("./pkmdata/sql/" + fileList[i], {encoding: "utf-8"});
        }

        return { pool, sqlQueries };
    });

    interface MoveIdName {
        move_id: number;
        name: string;
    }

    function getMoveIdName(name: string): Promise<MoveIdName[]> {
        return execSql("moveIdName", name);
    }

    interface SpeciesIdName {
        pokemon_species_id: number;
        name: string;
    }

    function getSpeciesIdName(name: string): Promise<SpeciesIdName[]> {
        return execSql("speciesIdName", name);
    }

    function getPreviousEvolution(id: number): Promise<{evolves_from_species_id: number, name: string}[]> {
        return execSql("previousEvolution", id);
    }

    interface LearnMethod {
        name: string;
        pokemonname: string;
        method_string: string;
    }

    interface LearnMethods {
        [name: string]: LearnMethod;
    }

    async function getLearnMethods(moveid: number, pokemonid: number, pokemonname: string) {
        return _.keyBy((await execSql("learnMethods", pokemonname, moveid, pokemonid)) as LearnMethod[], "name");
    }

    function getAbilityInfo(name: string): Promise<{name: string; effect: string;}[]> {
        return execSql("abilityInfo", name);
    }

    interface MoveData {
        move_name: string;
        damage_class: number;
        type_name: string;
        power: number;
        accuracy: number;
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
        return execSql("moveData", name);
    }

    type PokemonTypes = {name: string;}[]

    function getPokemonTypes(id: number): Promise<PokemonTypes> {
        return execSql("pokemonTypes", id);
    }

    function getPokemonTypesByName(name: string): Promise<PokemonTypes> {
        return execSql("pokemonTypesByName", name, name);
    }

    interface PokemonBaseStats {
        name: string;
        id: number;
        hp: number;
        atk: number;
        def: number;
        spatk: number;
        spdef: number;
        spd: number;
    }

    function getPokemonBaseStats(name: string): Promise<PokemonBaseStats[]> {
        return execSql("pokemonBaseStats", name, name);
    }

    type PokemonAbilities = {name: string; is_hidden: number; slot: number; }[];

    function getPokemonAbilities(id: number): Promise<PokemonAbilities> {
        return execSql("pokemonAbilities", id);
    }

    interface NatureModifiers {
        increased_stat_id: number;
        decreased_stat_id: number;
    }

    function getNatureModifiers(name: string): Promise<NatureModifiers[]> {
        return execSql("natureModifiers", name, name);
    }

    function getEggdata(name: string): Promise<{species_id: number; name: string; gender_rate: number; hatch_counter: number;}[]> {
        return execSql("eggdata", name);
    }

    type PokemonEggGroups = {name: string;}[];

    function getPokemonEggGroups(id: number): Promise<PokemonEggGroups> {
        return execSql("pokemonEggGroups", id);
    }

    function getTypesEfficiency(types: string[]): Promise<{name: string; damage_factor: number}[]> {
        if (types.length === 1) {
            return execSql("typesEfficiencyOne", ...types);
        } else {
            return execSql("typesEfficiencyTwo", ...types);
        }
    }

    function getTypeEfficiency(types: string[]): Promise<{name_one: string; name_two: string; damage_factor: 0 | 50 | 100 | 200;}[]> {
        return execSql("typeEfficiency", ...types);
    }

    function getTypeatkEfficiency(type: string): Promise<{type: string, damage_factor: number}[]> {
        return execSql("typeatkEfficiency", type);
    }

    function getGlId(name: string): Promise<{ id: string; }[]> {
        return execSql("glId", name);
    }

    function getItemData(name: string): Promise<{ short_effect: string; name: string; }[]> {
        return execSql("itemData", name);
    }

    function getPokemonIdBySpec(spec: string): Promise<{id: number;}[]> {
        return execSql("pokemonIdBySpec", spec, spec, spec, spec, spec, spec);
    }

    var statIds = {
        hp: 1,
        atk: 2,
        def: 3,
        spatk: 4,
        spdef: 5,
        spd: 6
    };

    type Stats = "hp" | "atk" | "def" | "spatk" | "spdef" | "spd";

    async function getPokemonIdByStat(stat: Stats, op: string, constraint: number): Promise<{id: number;}[]> {
        return await execSql(util.format((await conn.value()).sqlQueries["pokemonIdByStat"], op), statIds[stat], constraint);
    }

    function getPokemonNameById(id: number): Promise<{name: string}[]> {
        return execSql("pokemonNameById", id, id);
    }

    function getLanguageId(name: string): Promise<{language_id: number}[]> {
        return execSql("languageId", name);
    }

    function getTranslation(name: string, languageId: number): Promise<{name: string}[]> {
        return execSql("translation", languageId, name, languageId, name, languageId, name, languageId, name)
    }

    async function getAllLearnMethods(moveid: number, speciesid: number, speciesname: string): Promise<LearnMethods> {
        const learnMethods1 = await getLearnMethods(moveid, speciesid, speciesname);
        const previous = await getPreviousEvolution(speciesid);
        let learnMethods2 = {};
        if (previous[0].evolves_from_species_id > 0) {
            learnMethods2 = await getAllLearnMethods(moveid, previous[0].evolves_from_species_id, previous[0].name);
        }
        return { ...learnMethods1, ...learnMethods2 };
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

    function formatUsageTrend(ranking: pokemonGl.Ranking) {
        if (ranking !== undefined) {
            return util.format("%s (%d%%)", ranking.name, ranking.usageRate.toFixed(2));
        }
        return "";
    }

    return {
        handlers: {
            "!learn": async (command: Tennu.Command) => {
                const joined = command.args.join(" ");
                const moveid = await getMoveIdName(joined);
                const pokemonid = await getSpeciesIdName(joined);
                if (moveid.length === 0) {
                    return util.format("'%s' does not end in a valid move!", joined);
                } else if (pokemonid.length === 0) {
                    return util.format("'%s' does not begin with a valid Pokémon!", joined);
                } else {
                    const methods = await getAllLearnMethods(moveid[0].move_id, pokemonid[0].pokemon_species_id, pokemonid[0].name);
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
                }
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
                                e.accuracy ? e.accuracy + "%" : "--",
                                e.pp,
                                e.pp * 8 / 5
                            ), parseMoveDescription(e)
                        ]
                    } else {
                        return util.format("'%s' is not a valid move.", movename);
                    }
                })
            },

            "!stats": async (command: Tennu.Command) => {
                const joined = command.args.join(" ");

                const pokemon = await getPokemonBaseStats(joined);
                const nature = await getNatureModifiers(joined);
                if (pokemon.length > 0) {
                    var e = pokemon[0],
                        m = command.message.match(/(?:lvl|level)\s*(\d+)/i),
                        level: number = undefined,
                        evs: any = {},
                        types = await getPokemonTypes(e.id);

                    if (m) {
                        level = parseInt(m[1]);
                    }

                    while (m = /(\d+)\s*(hp|atk|def|spatk|spdef|spd)/ig.exec(command.message)) {
                        evs[m[2]] = parseInt(m[1]);
                    }

                    if (level === undefined && _.isEmpty(evs) && !nature.length) {
                        const abilities = await getPokemonAbilities(e.id);
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
                    } else {
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
                            e.id === 292 ? 1 : Math.floor((31 + 2*e.hp + Math.floor((evs.hp || 0)/4)) * level/100) + 10 + level,
                            calcStat(e.atk, evs.atk, 2, level, increased_stat, decreased_stat),
                            calcStat(e.def, evs.def, 3, level, increased_stat, decreased_stat),
                            calcStat(e.spatk, evs.spatk, 4, level, increased_stat, decreased_stat),
                            calcStat(e.spdef, evs.spdef, 5, level, increased_stat, decreased_stat),
                            calcStat(e.spd, evs.spd, 6, level, increased_stat, decreased_stat)
                        );
                    }
                } else {
                    return util.format("'%s' does not begin with a valid Pokémon.", joined);
                }
            },

            "!eggdata": async (command: Tennu.Command) => {
                const joined = command.args.join(" ");
                const rows = await getEggdata(joined);
                var e = rows[0];
                if (rows.length) {
                    const abilities = await getPokemonAbilities(e.species_id);
                    const eggGroups = await getPokemonEggGroups(e.species_id);
                    var partitionedAbilities = _.partition(abilities, "is_hidden");
                    return util.format("%s: [Gender] %s | [Hatch Cycles] %s | [Egg Groups] %s | [Abilities] %s %s",
                        e.name,
                        e.gender_rate !== -1 ? util.format("%d%% M, %d%% F", 100-e.gender_rate*12.5, e.gender_rate*12.5) : "Genderless",
                        e.hatch_counter * 256,
                        _.map(eggGroups, "name").join("/"),
                        _.map(partitionedAbilities[1], "name").join("/"),
                        partitionedAbilities[0].length ? "DW: " + partitionedAbilities[0][0].name : ""
                    );
                } else {
                    return util.format("'%s' is not a valid Pokémon.", joined);
                }
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

            "!typeatk": (command: Tennu.Command): Tennu.Reply => {
                if (command.args.length == 1) {
                    return getTypeatkEfficiency(command.args[0])
                    .then((rows) => {
                        var sorted = _.groupBy(rows, "damage_factor"),
                            res: string[] = [];
                        if (sorted[200] !== undefined) res.push("super effective damage against " + _.map(sorted[200], "name").join(", "));
                        if (sorted[100] !== undefined) res.push("normal damage against " + _.map(sorted[100], "name").join(", "));
                        if (sorted[50] !== undefined) res.push("not very effective damage against " + _.map(sorted[50], "name").join(", "));
                        if (sorted[0] !== undefined) res.push("no damage against " + _.map(sorted[0], "name").join(", "));
                        return util.format("%s deals %s.", _.capitalize(command.args[0].toLowerCase()), res.join("; "));
                    })
                } else {
                    return "Please specify exactly one type."
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
            },

            "!usage": (command: Tennu.Command): Tennu.Reply => {
                if (command.args.length === 0) {
                    return "Please specify a Pokémon.";
                }
                var joined = command.args.join(" ");
                getGlId(joined)
                .then((rows) => {
                    if (rows.length === 0) {
                        client.say(command.nickname, util.format("'%s' is not a valid Pokémon.", joined));
                    }
                    pokemonGl.GetGLData(rows[0].id)
                    .then((data) => {
                        if ((<any>data.rankingPokemonTrend) === "") {
                            client.say(command.nickname, util.format("There is no usage data for %s.", data.rankingPokemonInfo.name));
                        } else {
                            var table = new Table();
                            for (let i = 0; i < 10; ++i) {
                                table.cell("Used Moves", formatUsageTrend(data.rankingPokemonTrend.wazaInfo[i]));
                                table.cell("Used Abilities", formatUsageTrend(data.rankingPokemonTrend.tokuseiInfo[i]));
                                table.cell("Used Natures", formatUsageTrend(data.rankingPokemonTrend.seikakuInfo[i]))
                                table.cell("Used Items", formatUsageTrend(data.rankingPokemonTrend.itemInfo[i]))
                                table.cell("Common Partners", data.rankingPokemonIn[i].name);
                                table.cell("Common Counters", data.rankingPokemonDown[i].name);
                                table.newRow();
                            }
                            client.say(command.nickname, [util.format("Usage data for %s.", data.rankingPokemonInfo.name), " "]);
                            client.say(command.nickname, table.toString().match(/^.+$/gm));
                        }
                    });
                });
            },

            "!item": (command: Tennu.Command) => {
                var joined = command.args.join(" ");
                return getItemData(joined)
                .then((rows) => {
                    if (rows.length === 0) {
                        return util.format("'%s' is not a valid item.", joined);
                    } else {
                        return util.format("%s: %s", rows[0].name, rows[0].short_effect);
                    }
                })
            },

            "!search": (command: Tennu.Command) => {
                var m: RegExpExecArray, promises: Promise<{id: number}[]>[] = [],
                    re = /(?:.search|,)\s*([\w\s.-]+)\s*(?=,|$)/g;
                while (m = re.exec(command.message)) {
                    promises.push(getPokemonIdBySpec(m[1]));
                }
                re = /(?:.search|,)\s*(hp|atk|def|spatk|spdef|spd)\s*([<>]=?|=)\s*(\d+)/g;
                while (m = re.exec(command.message)) {
                    promises.push(getPokemonIdByStat(m[1] as Stats, m[2], parseInt(m[3])));
                }
                return Promise.all(promises)
                .then((results) => {
                    return _.intersection.apply(_, _.map(results, (e) => { return _.map(e, "id"); }));
                })
                .then((ids: number[]) => {
                    return Promise.all(_.map(_.take(ids, 5), getPokemonNameById));
                })
                .then((names) => {
                    var res = _.map(names, (e) => { return e[0].name; }).join(", ");
                    if (res !== "") {
                        return res;
                    }
                    return "Unfortunately I couldn't find any Pokémon matching all of the above."
                })
            },

            "!translate": function(command: Tennu.Command) {
                return getLanguageId(command.args[command.args.length-1])
                .then((rows) => {
                    if (rows.length) {
                        return getTranslation(command.args.slice(0, -1).join(" "), rows[0].language_id)
                        .then((rows) => {
                            if (rows.length) {
                                return rows[0].name;
                            } else {
                                return "I can't find anything under that name.";
                            }
                        });
                    } else {
                        return "I don't know that language.";
                    }
                });
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

            "typeatk": [
                "type <type>",
                " ",
                "List all the types the given type deals super effective/not every effective/... damage against."
            ],

            "types": [
                "types <type> <type>",
                " ",
                "Return if the first type deals neutral, super effective, ... damage against the second."
            ],

            "usage": [
                "usage <pokemon>",
                " ",
                "Fetch and return usage data for the given Pokémon from Pokémon GL."
            ],

            "item": [
                "item <item>",
                " ",
                "Return the effect/usage of the item."
            ],

            "search": [
                "search [<ability>/<move>/<type>/<stat op constraint>, ...]*",
                " ",
                "Return up to five Pokémon that statisfy the given constraints.",
                "'stat' can be one of hp/atk/def/spatk/spdef/spd, op can be one of <, >, =, <=, >= and constraint must be a number."
            ],

            "translate": [
                "translate <ability>/<item>/<move>/<pokemon> <language>",
                " ",
                "Translate the given name to the given language.",
                "Both name and language can be supplied in Japanese/English/French/German/Italian."
            ]
        },

        commands: ["learn", "ability", "move", "stats", "eggdata", "type", "typeatk", "types", "usage", "item", "search", "translate"]
    }
}

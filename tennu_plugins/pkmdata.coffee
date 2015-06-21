mysql = require '../mysql-bootstrap'
Promise = require 'bluebird'
_ = require 'lodash'

module.exports =
    init: (client, imports) ->
        pool = mysql.createPool(client.config("veekun"))
        client._socket.on "close", ->
            pool.end(_.noop)

        execSql = pool.execSql.bind(pool)

        getMoveIdName = (name) ->
            execSql("""SELECT move_id, name FROM move_names WHERE local_language_id = 9 AND move_id =
                          (SELECT DISTINCT move_id FROM move_names WHERE ? LIKE concat('% ', name) ORDER BY LENGTH(name) DESC LIMIT 1)""", [name])

        getSpeciesIdName = (name) ->
            execSql("""SELECT pokemon_species_id, name FROM pokemon_species_names WHERE local_language_id = 9
                           AND pokemon_species_id = (SELECT DISTINCT pokemon_species_id FROM pokemon_species_names WHERE
                           ? LIKE concat(name, ' %'))""", [name])

        getPreviousEvolution = (id) ->
            execSql("""SELECT pokemon_species.evolves_from_species_id, pokemon_species_names.name
                       FROM pokemon_species
                       LEFT JOIN pokemon_species_names ON pokemon_species_names.pokemon_species_id = pokemon_species.evolves_from_species_id AND pokemon_species_names.local_language_id = 9
                       WHERE pokemon_species.id = ?""", [id])

        getLearnMethods = (moveid, pokemonid, pokemonname) ->
            execSql("""SELECT name, ? AS pokemonname,
                              GROUP_CONCAT(versions_level_method_string ORDER BY version_group_id SEPARATOR ", ") AS method_string
                       FROM (SELECT name, MIN(version_group_id) AS version_group_id,
                                    CONCAT(CASE
                                               WHEN pokemon_move_method_id = 1
                                                   THEN CONCAT("at level ", level, " ")
                                                   ELSE ""
                                           END, CONCAT("in ", GROUP_CONCAT(method_string SEPARATOR ", "))) AS versions_level_method_string
                              FROM (SELECT pokemon_move_method_prose.name, pokemon_moves.version_group_id, pokemon_moves.pokemon_move_method_id,
                                           GROUP_CONCAT(DISTINCT pokemon_moves.level ORDER BY pokemon_moves.level SEPARATOR '/') AS level,
                                           GROUP_CONCAT(DISTINCT version_names.name ORDER BY version_names.version_id SEPARATOR '/') AS method_string
                                    FROM pokemon_move_method_prose
                                    JOIN pokemon_moves ON pokemon_moves.pokemon_move_method_id = pokemon_move_method_prose.pokemon_move_method_id
                                         AND pokemon_moves.move_id = ? AND pokemon_moves.pokemon_id IN (SELECT id FROM pokemon WHERE species_id = ?)
                                    JOIN versions ON versions.version_group_id = pokemon_moves.version_group_id
                                    JOIN version_names ON versions.id = version_names.version_id AND version_names.local_language_id = 9
                                    WHERE pokemon_move_method_prose.local_language_id = 9
                                    GROUP BY pokemon_moves.pokemon_move_method_id, pokemon_moves.version_group_id) AS methods
                              GROUP BY `name`, `level`) AS version_level_group_methods
                       GROUP BY `name`""", [pokemonname, moveid, pokemonid])
            .then (rows) ->
                _.indexBy(rows, 'name')

        getAbilityInfo = (name) ->
            execSql("""SELECT ability_names.name, ability_prose.effect FROM ability_prose
                       JOIN ability_names ON ability_prose.ability_id = ability_names.ability_id
                           AND ability_names.ability_id =
                               (SELECT DISTINCT ability_id FROM ability_names WHERE name = ?)
                       WHERE ability_prose.local_language_id = 9 AND ability_names.local_language_id = 9""", [name])

        getMoveData = (name) ->
            execSql("""SELECT move_names.name AS move_name, move_damage_classes.identifier AS damage_class,
                              type_names.name AS type_name, moves.power, moves.accuracy, moves.pp, moves.priority,
                              move_effect_prose.short_effect, move_meta.meta_category_id, move_meta.ailment_chance,
                              move_meta.flinch_chance, move_meta.stat_chance, move_target_prose.name AS target
                       FROM moves
                       JOIN move_names ON move_names.move_id = moves.id AND move_names.local_language_id = 9
                       JOIN move_damage_classes ON move_damage_classes.id = moves.damage_class_id
                       JOIN type_names ON moves.type_id = type_names.type_id AND type_names.local_language_id = 9
                       JOIN move_effect_prose ON moves.effect_id = move_effect_prose.move_effect_id
                            AND move_effect_prose.local_language_id = 9
                       JOIN move_meta ON moves.id = move_meta.move_id
                       JOIN move_target_prose ON moves.target_id = move_target_prose.move_target_id
                            AND move_target_prose.local_language_id = 9
                       WHERE moves.id = (SELECT DISTINCT move_id FROM move_names WHERE name = ?)""", [name])

        getPokemonBaseStats = (name) ->
            execSql("""SELECT pokemon_species_names.name, pokemon.species_id,
                              (SELECT base_stat FROM pokemon_stats WHERE stat_id = 1 AND pokemon_id = pokemon.species_id) AS hp,
                              (SELECT base_stat FROM pokemon_stats WHERE stat_id = 2 AND pokemon_id = pokemon.species_id) AS atk,
                              (SELECT base_stat FROM pokemon_stats WHERE stat_id = 3 AND pokemon_id = pokemon.species_id) AS def,
                              (SELECT base_stat FROM pokemon_stats WHERE stat_id = 4 AND pokemon_id = pokemon.species_id) AS spatk,
                              (SELECT base_stat FROM pokemon_stats WHERE stat_id = 5 AND pokemon_id = pokemon.species_id) AS spdef,
                              (SELECT base_stat FROM pokemon_stats WHERE stat_id = 6 AND pokemon_id = pokemon.species_id) AS spd
                       FROM pokemon
                       JOIN pokemon_species_names ON pokemon_species_names.pokemon_species_id = pokemon.species_id AND pokemon_species_names.local_language_id = 9
                       WHERE pokemon.species_id = (SELECT DISTINCT pokemon_species_id FROM pokemon_species_names WHERE ? LIKE concat(name, '%'))""", [name])

        getPokemonTypes = (id) ->
            execSql("""SELECT type_names.name
                       FROM pokemon_types
                       JOIN type_names ON type_names.type_id = pokemon_types.type_id AND type_names.local_language_id = 9
                       WHERE pokemon_types.pokemon_id = ?
                       ORDER BY pokemon_types.slot""", [id])

        getPokemonTypesByName = (pokemonname) ->
            execSql("""SELECT DISTINCT type_names.name
                       FROM pokemon_types
                       JOIN pokemon_species_names ON pokemon_species_names.pokemon_species_id = pokemon_types.pokemon_id
                            AND pokemon_species_names.name = ?
                       JOIN type_names ON type_names.type_id = pokemon_types.type_id AND type_names.local_language_id = 9
                       ORDER BY pokemon_types.slot""", [pokemonname])

        getPokemonAbilities = (id) ->
            execSql("""SELECT ability_names.name, pokemon_abilities.is_hidden, pokemon_abilities.slot
                       FROM pokemon_abilities
                       JOIN ability_names ON ability_names.ability_id = pokemon_abilities.ability_id AND ability_names.local_language_id = 9
                       WHERE pokemon_abilities.pokemon_id = ?
                       ORDER BY pokemon_abilities.slot""", [id])

        getNatureModifiers = (name) ->
            execSql("""SELECT natures.increased_stat_id, natures.decreased_stat_id
                       FROM natures
                       JOIN nature_names ON natures.id = nature_names.nature_id AND ? LIKE CONCAT('%', nature_names.name, '%')""", [name])

        getEggdata = (name) ->
            execSql("""SELECT pokemon.species_id, pokemon_species_names.name, pokemon_species.gender_rate, pokemon_species.hatch_counter
                       FROM pokemon
                       JOIN pokemon_species_names ON pokemon.species_id = pokemon_species_names.pokemon_species_id AND pokemon_species_names.local_language_id = 9
                       JOIN pokemon_species ON pokemon.species_id = pokemon_species.id
                       WHERE pokemon.species_id = (SELECT DISTINCT pokemon_species_id FROM pokemon_species_names WHERE name = ?)""", [name])

        getPokemonEggGroups = (id) ->
            execSql("""SELECT egg_group_prose.name
                       FROM pokemon_egg_groups
                       JOIN egg_group_prose ON pokemon_egg_groups.egg_group_id = egg_group_prose.egg_group_id
                            AND egg_group_prose.local_language_id = 9
                       WHERE pokemon_egg_groups.species_id = ?""", [id])

        getTypesEfficiency = (types) ->
            if types.length == 1
                execSql("""SELECT type_names.name, type_efficacy.damage_factor
                           FROM type_efficacy
                           JOIN type_names ON type_efficacy.damage_type_id = type_names.type_id AND type_names.local_language_id = 9
                           WHERE type_efficacy.target_type_id = (SELECT DISTINCT type_id FROM type_names WHERE name = ?)
                           ORDER BY damage_factor ASC""", types)
            else
                execSql("""SELECT type_names.name, (type_one.damage_factor * type_two.damage_factor / 100) AS damage_factor
                           FROM type_efficacy AS type_one
                           JOIN type_efficacy AS type_two ON type_one.damage_type_id = type_two.damage_type_id
                           JOIN type_names ON type_one.damage_type_id = type_names.type_id AND type_names.local_language_id = 9
                           WHERE type_one.target_type_id = (SELECT DISTINCT type_id FROM type_names WHERE name = ?)
                                 AND type_two.target_type_id = (SELECT DISTINCT type_id FROM type_names WHERE name = ?)
                           ORDER BY damage_factor ASC""", types)

        getTypeEfficiency = (types) ->
            execSql("""SELECT (SELECT name FROM type_names WHERE type_id = type_efficacy.damage_type_id AND local_language_id = 9) AS name_one,
                              (SELECT name FROM type_names WHERE type_id = type_efficacy.target_type_id AND local_language_id = 9) AS name_two,
                              type_efficacy.damage_factor
                       FROM type_efficacy
                       JOIN type_names AS type_one ON type_one.type_id = type_efficacy.damage_type_id AND type_one.local_language_id = 9
                       JOIN type_names AS type_two ON type_two.type_id = type_efficacy.target_type_id AND type_two.local_language_id = 9
                       WHERE type_efficacy.damage_type_id = (SELECT DISTINCT type_id FROM type_names WHERE name = ?)
                             AND type_efficacy.target_type_id = (SELECT DISTINCT type_id FROM type_names WHERE name = ?)""", types)

        getAllLearnMethods = (moveid, speciesid, speciesname) ->
            Promise.join getLearnMethods(moveid, speciesid, speciesname),
                getPreviousEvolution(speciesid)
                .then((previous) ->
                    if previous[0].evolves_from_species_id > 0
                        getAllLearnMethods(moveid, previous[0].evolves_from_species_id, previous[0].name)
                    else
                        {}
                ), (methods_one, methods_two) ->
                    _.defaults(methods_one, methods_two)


        parseDescription = (description) ->
            description.replace /\[([^\]]*)\]\{\w+:([^}]*)\}/g, (match, one, two, offset, string) ->
                if one != ""
                    one
                else
                    _.map(two.split("-"), _.capitalize).join(" ")

        parseMoveDescription = (move) ->
            parseDescription(move.short_effect).replace /\$effect_chance%/, (match, one, offset, string) ->
                switch move.meta_category_id
                    when 2, 6, 7, 13
                        "#{move.stat_chance}%"
                    when 4
                        "#{move.ailment_chance}%"
                    when 0
                        "#{move.ailment_chance||move.flinch_chance}%"


        handlers:
            "!learn": (command) ->
                joined = command.args.join(" ")
                Promise.join(
                    getMoveIdName(joined)
                    getSpeciesIdName(joined)
                    (moveid, pokemonid) ->
                        unless moveid[0]?
                            "'#{joined}' does not end in a valid move!"
                        else unless pokemonid[0]?
                            "#{joined} does not begin with a valid Pokémon!"
                        else
                            getAllLearnMethods(moveid[0].move_id, pokemonid[0].pokemon_species_id, pokemonid[0].name)
                            .then (methods) ->
                                unless _.isEmpty(methods)
                                    methodString = _.map methods, (e) ->
                                        "\x02#{e.name}\x02 #{e.method_string}#{(if e.pokemonname != pokemonid[0].name then " as #{e.pokemonname}" else "")}"
                                    .join("; via ")
                                    "#{pokemonid[0].name} can learn #{moveid[0].name} via #{methodString}.".match(/.{1,400}(?: |$)/g)
                                else
                                    "#{pokemonid[0].name} cannot learn #{moveid[0].name}."
                )

            "!ability": (command) ->
                ability = command.args.join(" ")
                getAbilityInfo(ability)
                .then((rows) ->
                    e = rows[0]
                    if e?
                        res = parseDescription(e.effect).split("\n")
                        res[0] = "#{e.name}: #{res[0]}"
                        res
                    else
                        "'#{ability}' is not a valid ability."
                )

            "!move": (command) ->
                movename = command.args.join(" ")
                getMoveData(movename)
                .then((rows) ->
                    e = rows[0]
                    if e?
                        [
                            "[#{e.move_name}] Category: #{_.capitalize(e.damage_class)} | Type: #{e.type_name} | Priority: #{e.priority} | Target: #{e.target} | BP: #{if e.power then e.power else '--'} | Acc: #{if e.accuracy then "#{e.accuracy}%" else '--'} | PP: #{e.pp} (#{e.pp*8/5})"
                            parseMoveDescription(e)
                        ]
                    else
                        "'#{movename}' is not a valid move."
                )

            "!stats": (command) ->
                joined = command.args.join(" ")
                Promise.join(getPokemonBaseStats(joined),
                    getNatureModifiers(joined), (pokemon, nature) ->
                        e = pokemon[0]
                        if e?
                            if m = command.message.match(/(?:lvl?|level)\s*(\d+)/i)
                                level = parseInt(m[1])
                            evparser = /(\d+)\s*(hp|atk|def|spatk|spdef|spd)/ig
                            evs = {}
                            while m = evparser.exec(command.message)
                                evs[m[2]] = parseInt(m[1])
                            types = getPokemonTypes(e.species_id)
                            console.log nature
                            unless level? || !(_.isEmpty(evs)) || nature.length
                                Promise.join(types,
                                             getPokemonAbilities(e.species_id),
                                             (types, abilities) ->
                                                 "#{e.name}: (#{_.map(types, (t) -> t.name).join("/")}) #{e.hp}/#{e.atk}/#{e.def}/#{e.spatk}/#{e.spdef}/#{e.spd} #{_.map(abilities, (a) -> "[#{if a.is_hidden then "HA" else a.slot-1}] #{a.name}").join(" ")} | BST: #{e.hp+e.atk+e.def+e.spatk+e.spdef+e.spd}"
                                )
                            else
                                types.then (types) ->
                                    calcStats = (level, increased, decreased, evs) ->
                                        calcStat = (base, ev, num) ->
                                            ev = ev || 0
                                            Math.floor((Math.floor((31 + 2*base + Math.floor(ev/4)) * level/100) + 5) * (1 + 0.1 * (increased == num) - 0.1 * (decreased == num)))
                                        """#{e.name}: (#{_.map(types, (t) -> t.name).join("/")}) \
                                           #{Math.floor((31 + 2*e.hp + Math.floor((evs.hp || 0)/4)) * level/100) + 10 + level}/\
                                           #{calcStat(e.atk, evs.atk, 2)}/\
                                           #{calcStat(e.def, evs.def, 3)}/\
                                           #{calcStat(e.spatk, evs.spatk, 4)}/\
                                           #{calcStat(e.spdef, evs.spdef, 5)}/\
                                           #{calcStat(e.spd, evs.spd, 6)}"""
                                    level = 100 unless level?
                                    if nature.length
                                        calcStats(level, nature[0].increased_stat_id, nature[0].decreased_stat_id, evs)
                                    else
                                        calcStats(level, 2, 2, evs)
                        else
                            "'#{joined}' does not begin with a valid Pokémon."
                )

            "!eggdata": (command) ->
                joined = command.args.join(" ")
                getEggdata(joined)
                .then (rows) ->
                    e = rows[0]
                    if e?
                        Promise.join(
                            getPokemonAbilities(e.species_id),
                            getPokemonEggGroups(e.species_id),
                            (abilities, eggGroups) ->
                                abilities = _.partition(abilities, "is_hidden")
                                "#{e.name}: [Gender] #{if e.gender_rate != -1 then "#{(8-e.gender_rate)*12.5}% M, #{e.gender_rate*12.5}% F" else "Genderless"} | [Hatch Cycles] #{e.hatch_counter * 256} | [Egg Groups] #{_.map(eggGroups, "name").join("/")} | [Abilities] #{_.map(abilities[1], "name").join("/")} #{if abilities[0].length then "DW: #{abilities[0][0].name}" else ""}"
                        )
                    else
                        "'#{joined}' is not a valid Pokemon."

            "!type": (command) ->
                # TODO nicer formatting
                # TODO Refactor SQL?
                switch command.args.length
                    when 0
                        "Please specify at least ony type."
                    when 1, 2
                        getTypesEfficiency(command.args)
                        .then (rows) ->
                            if rows.length
                                rows
                            else
                                getPokemonTypesByName(command.args.join(" "))
                                .then (rows) ->
                                    getTypesEfficiency(_.map(rows, "name"))
                        .then (rows) ->
                            sorted = _.groupBy(rows, "damage_factor")
                            """#{if sorted[400]? then "4x weak to: #{_.map(sorted[400], "name").join(", ")}; " else ""}\
                               #{if sorted[200]? then "2x weak to: #{_.map(sorted[200], "name").join(", ")}; " else ""}\
                               #{if sorted[25]? then "4x resistant against: #{_.map(sorted[25], "name").join(", ")}; " else ""}\
                               #{if sorted[50]? then "2x resistant against: #{_.map(sorted[50], "name").join(", ")}; " else ""}\
                               #{if sorted[0]? then "completely resistant against: #{_.map(sorted[0], "name").join(", ")}" else ""}"""
                    else
                        "Please specify no more than two types."

            "!types": (command) ->
                if command.args.length == 2
                    getTypeEfficiency(command.args)
                    .then (rows) ->
                        e = rows[0]
                        damageTypes =
                            0: "no"
                            50: "not very effective"
                            100: "neutral"
                            200: "super effective"
                        "#{e.name_one} deals #{damageTypes[e.damage_factor]} damage against #{e.name_two}."
                else
                    "Please specify exactly two types."

        help:
            "learn": [
                "learn <pokemon> <move>"
                " "
                "Will tell you if and how a Pokémon can learn a move."
                "Unfortunately the underlying database does not contain information about Event only moves."
                "False negatives are possible in that case."
            ]

            "ability": [
                "ability <ability>"
                " "
                "Return information about the given ability."
            ]

            "move": [
                "move <move>"
                " "
                "Return the move's stats and a description."
            ]

            "stats": [
                "stats <pokemon> [additional parameters]"
                " "
                "If no additional parameters are given, return type, base stats and ability of the given Pokemon."
                "If addition parameters are given, i.e. the level (in the form 'lvl 100'), the nature and the EVs (in the form '100 (hp|atk|def|spatk|spdef)'), the actual stats are calculated."
            ]

            "eggdata": [
                "eggdata <pokemon>"
                " "
                "Return data such as hatch cycles, gender ratio and abilities."
            ]

            "type": [
                "type <type> [type]"
                "type <pokemon>"
                " "
                "You can specify either one or two types or a single Pokemon.."
                "Return a list of what types are effective, not very effective, etc. against the given types or Pokemon."
            ]

            "types": [
                "types <type> <type>"
                " "
                "Return if the first type deals neutral, super effective, ... damage against the second."
            ]

        commands: ["learn", "ability", "move", "stats", "eggdata", "type", "types"]

pool = require '../veekun'
Promise = require 'bluebird'
_ = require 'lodash'

execSql = (sql, replacement) ->
    pool.getConnectionAsync()
    .then (connection) ->
        [connection, connection.queryAsync(sql, replacement)]
    .spread (connection, rows) ->
        connection.release()
        rows[0]

getMoveIdName = (name) ->
    execSql("""SELECT move_id, name FROM move_names WHERE local_language_id = 9 AND move_id =
                  (SELECT DISTINCT move_id FROM move_names WHERE ? LIKE concat('% ', name))""", [name])

getSpeciesIdName = (name) ->
    execSql("""SELECT pokemon_species_id, name FROM pokemon_species_names WHERE local_language_id = 9
                   AND pokemon_species_id = (SELECT DISTINCT pokemon_species_id FROM pokemon_species_names WHERE
                   ? LIKE concat(name, ' %'))""", [name])

getLearnMethods = (moveid, pokemonid) ->
    execSql("""SELECT DISTINCT pokemon_move_method_prose.name
               FROM pokemon_move_method_prose
               JOIN pokemon_moves ON pokemon_moves.pokemon_move_method_id = pokemon_move_method_prose.pokemon_move_method_id
                    AND pokemon_moves.move_id = ? AND pokemon_moves.pokemon_id = ?
               WHERE pokemon_move_method_prose.local_language_id = 9""", [moveid, pokemonid])

getAbilityInfo = (name) ->
    execSql("""SELECT ability_names.name, ability_prose.effect FROM ability_prose
               JOIN ability_names ON ability_prose.ability_id = ability_names.ability_id
                   AND ability_names.ability_id =
                       (SELECT DISTINCT ability_id FROM ability_names WHERE name = ?)
               WHERE ability_prose.local_language_id = 9 AND ability_names.local_language_id = 9""", [name])

getMoveData = (name) ->
    execSql("""SELECT move_names.name AS move_name, move_damage_classes.identifier AS damage_class,
                      type_names.name AS type_name, moves.power, moves.accuracy, moves.pp,
                      move_effect_prose.short_effect
               FROM moves
               JOIN move_names ON move_names.move_id = moves.id AND move_names.local_language_id = 9
               JOIN move_damage_classes ON move_damage_classes.id = moves.damage_class_id
               JOIN type_names ON moves.type_id = type_names.type_id AND type_names.local_language_id = 9
               JOIN move_effect_prose ON moves.effect_id = move_effect_prose.move_effect_id
                    AND move_effect_prose.local_language_id = 9
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

getPokemonAbilities = (id) ->
    execSql("""SELECT ability_names.name, pokemon_abilities.is_hidden, pokemon_abilities.slot
               FROM pokemon_abilities
               JOIN ability_names ON ability_names.ability_id = pokemon_abilities.ability_id AND ability_names.local_language_id = 9
               WHERE pokemon_abilities.pokemon_id = ?
               ORDER BY pokemon_abilities.slot""", [id])

getNatureModifiers = (name) ->
    execSql("""SELECT natures.increased_stat_id, natures.decreased_stat_id
               FROM natures
               JOIN nature_names ON natures.id = nature_names.nature_id AND nature_names.name = ?""", [name])

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


module.exports =
    init: (client, imports) ->
        handlers:
            "!learn": (command) ->
                # TODO Consider searching previous evolutions.
                # TODO Improve output
                joined = command.args.join(" ")
                Promise.join(
                    getMoveIdName(joined)
                    getSpeciesIdName(joined)
                    (moveid, pokemonid) ->
                        unless moveid[0]?
                            "'#{joined}' does not end in a valid move!"
                        else unless pokemonid[0]?
                            "#{joined} does not end in a valid Pokémon!"
                        else
                            getLearnMethods(moveid[0].move_id, pokemonid[0].pokemon_species_id)
                            .then((rows) ->
                                if rows.length > 0
                                    "#{pokemonid[0].name} can learn #{moveid[0].name} via #{_.map(rows, (e) -> e.name).join(", ")}."
                                else
                                    "#{pokemonid[0].name} cannot learn #{moveid[0].name}."
                            )
                )

            "!ability": (command) ->
                # TODO Parse weird formatting
                ability = command.args.join(" ")
                getAbilityInfo(ability)
                .then((rows) ->
                    e = rows[0]
                    if e?
                        res = e.effect.split("\n")
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
                            "[#{e.move_name}] Category: #{_.capitalize(e.damage_class)} | Type: #{e.type_name} | BP: #{if e.bp then e.bp else '--'} | Acc: #{if e.accuracy then "#{e.accuracy}%" else '--'} | PP: #{e.pp} (#{e.pp*8/5})"
                            e.short_effect
                        ]
                    else
                        "'#{movename}' is not a valid move."
                )

            "!stats": (command) ->
                joined = command.args.join(" ")
                getPokemonBaseStats(joined)
                .then((rows) ->
                    e = rows[0]
                    if e?
                        types = getPokemonTypes(e.species_id)
                        if joined.toLowerCase() == e.name.toLowerCase()
                            Promise.join(types,
                                         getPokemonAbilities(e.species_id),
                                         (types, abilities) ->
                                             "#{e.name}: (#{_.map(types, (t) -> t.name).join("/")}) #{e.hp}/#{e.atk}/#{e.def}/#{e.spatk}/#{e.spdef}/#{e.spd} #{_.map(abilities, (a) -> "[#{if a.is_hidden then "HA" else a.slot-1}] #{a.name}").join(" ")} | BST: #{e.hp+e.atk+e.def+e.spatk+e.spdef+e.spd}"
                            )
                        else
                            types.then((types) ->
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
                                level = 100
                                if m = command.message.match(/lvl?\s*(\d+)/i)
                                    level = parseInt(m[1])
                                natureparser = /(hardy|bold|modest|calm|timid|lonely|docile|mild|gentle|hasty|adamant|impish|bashful|careful|rash|jolly|naughty|lax|quirky|naive|brave|relaxed|quiet|sassy|serious)/i
                                evparser = /(\d+)\s*(hp|atk|def|spatk|spdef|spd)/ig
                                evs = {}
                                while m = evparser.exec(command.message)
                                    evs[m[2]] = parseInt(m[1])
                                if m = command.message.match(natureparser)
                                    getNatureModifiers(m[1])
                                    .then((nature) ->
                                        calcStats(level, nature[0].increased_stat_id, nature[0].decreased_stat_id, evs)
                                    )
                                else
                                    calcStats(level, 2, 2, evs)
                            )
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
                                "#{e.name}: [Gender] #{if e.gender_rate != -1 then "#{(8-e.gender_rate)*12.5}% M, #{e.gender_rate*12.5}% F}" else "Genderless"} | [Hatch Cycles] #{e.hatch_counter * 256} | [Egg Groups] #{_.map(eggGroups, "name").join("/")} | [Abilities] #{_.map(abilities[1], "name").join("/")} #{if abilities[0].length then "DW: #{abilities[0][0].name}" else ""}"
                        )
                    else
                        "'#{joined}' is not a valid Pokemon."

                # TODO implement $type, $types

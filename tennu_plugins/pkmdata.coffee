db = require '../veekun'
Promise = require 'bluebird'
_ = require 'lodash'

module.exports =
    init: (client, imports) ->
        handlers:
            "!learn": (command) ->
                m = command.message.match(/^.learn\s+([^,]*?)\s*,\s*(.*)$/)
                movename = m[2]
                pokemonname = m[1]
                Promise.join(
                    db.getAsync("SELECT move_id, name FROM move_names WHERE local_language_id = 9 AND move_id = (SELECT DISTINCT move_id FROM move_names WHERE LOWER(name) = $movename)", $movename: movename.toLowerCase()),
                    db.getAsync("SELECT pokemon_species_id, name FROM pokemon_species_names WHERE local_language_id = 9 AND pokemon_species_id = (SELECT DISTINCT pokemon_species_id FROM pokemon_species_names where LOWER(name) = $name)", $name: pokemonname.toLowerCase()),
                    (moveid, pokemonid) ->
                        unless moveid?
                            "'#{movename}' is not a valid move!"
                        else unless pokemonid?
                            "#{pokemonname} is not a valid Pokémon!"
                        else
                            db.allAsync("""SELECT DISTINCT pokemon_move_method_prose.name
                                           FROM pokemon_move_method_prose
                                           JOIN pokemon_moves ON pokemon_moves.pokemon_move_method_id = pokemon_move_method_prose.pokemon_move_method_id
                                                AND pokemon_moves.move_id = $moveid AND pokemon_moves.pokemon_id = $pokemonid
                                           WHERE pokemon_move_method_prose.local_language_id = 9
                                        """, $moveid: moveid.move_id, $pokemonid: pokemonid.pokemon_species_id)
                            .then((rows) ->
                                if rows.length > 0
                                    "#{pokemonid.name} can learn #{moveid.name} via #{_.map(rows, (e) -> e.name).join(", ")}."
                                else
                                    "#{pokemonid.name} cannot learn #{moveid.name}."
                            )
                )

            "!ability": (command) ->
                ability = command.args.join(" ")
                db.getAsync("""SELECT ability_names.name, ability_prose.effect FROM ability_prose
                               JOIN ability_names ON ability_prose.ability_id = ability_names.ability_id
                                   AND ability_names.ability_id =
                                       (SELECT DISTINCT ability_id FROM ability_names WHERE LOWER(name) = $ability)
                               WHERE ability_prose.local_language_id = 9 AND ability_names.local_language_id = 9
                            """, $ability: ability.toLowerCase())
                .then((e) ->
                    if e?
                        res = e.effect.split("\n")
                        res[0] = "#{e.name}: #{res[0]}"
                        res
                    else
                        "'#{ability}' is not a valid ability."
                )

            "!move": (command) ->
                movename = command.args.join(" ")
                db.getAsync("""SELECT move_names.name AS move_name, move_damage_classes.identifier AS damage_class,
                                      type_names.name AS type_name, moves.power, moves.accuracy, moves.pp,
                                      move_effect_prose.short_effect
                               FROM moves
                               JOIN move_names ON move_names.move_id = moves.id AND move_names.local_language_id = 9
                               JOIN move_damage_classes ON move_damage_classes.id = moves.damage_class_id
                               JOIN type_names ON moves.type_id = type_names.type_id AND type_names.local_language_id = 9
                               JOIN move_effect_prose ON moves.effect_id = move_effect_prose.move_effect_id
                                    AND move_effect_prose.local_language_id = 9
                               WHERE moves.id = (SELECT DISTINCT move_id FROM move_names WHERE LOWER(name) = $movename)
                            """, $movename: movename.toLowerCase())
                .then((e) ->
                    if e?
                        [
                            "[#{e.move_name}] Category: #{_.capitalize(e.damage_class)} | Type: #{e.type_name} | BP: #{if e.bp then e.bp else '--'} | Acc: #{if e.accuracy then "#{e.accuracy}%" else '--'} | PP: #{e.pp} (#{e.pp*8/5})"
                            e.short_effect
                        ]
                    else
                        "'#{movename}' is not a valid move."
                )

            "!stats": (command) ->
                db.getAsync("""SELECT pokemon_species_names.name, pokemon.species_id,
                                      (SELECT base_stat FROM pokemon_stats WHERE stat_id = 1 AND pokemon_id = pokemon.species_id) AS hp,
                                      (SELECT base_stat FROM pokemon_stats WHERE stat_id = 2 AND pokemon_id = pokemon.species_id) AS atk,
                                      (SELECT base_stat FROM pokemon_stats WHERE stat_id = 3 AND pokemon_id = pokemon.species_id) AS def,
                                      (SELECT base_stat FROM pokemon_stats WHERE stat_id = 4 AND pokemon_id = pokemon.species_id) AS spatk,
                                      (SELECT base_stat FROM pokemon_stats WHERE stat_id = 5 AND pokemon_id = pokemon.species_id) AS spdef,
                                      (SELECT base_stat FROM pokemon_stats WHERE stat_id = 6 AND pokemon_id = pokemon.species_id) AS spd
                               FROM pokemon
                               JOIN pokemon_species_names ON pokemon_species_names.pokemon_species_id = pokemon.species_id AND pokemon_species_names.local_language_id = 9
                               WHERE pokemon.species_id = (SELECT DISTINCT pokemon_species_id FROM pokemon_species_names WHERE LOWER(name) = $name)
                            """, $name: command.args[0].toLowerCase())
                .then((e) ->
                    if e?
                        types = db.allAsync("""SELECT type_names.name
                                               FROM pokemon_types
                                               JOIN type_names ON type_names.type_id = pokemon_types.type_id AND type_names.local_language_id = 9
                                               WHERE pokemon_types.pokemon_id = $id
                                               ORDER BY pokemon_types.slot
                                               """, $id: e.species_id)
                        if command.args.length == 1
                            Promise.join(types,
                                         db.allAsync("""SELECT ability_names.name, pokemon_abilities.is_hidden, pokemon_abilities.slot
                                                        FROM pokemon_abilities
                                                        JOIN ability_names ON ability_names.ability_id = pokemon_abilities.ability_id AND ability_names.local_language_id = 9
                                                        WHERE pokemon_abilities.pokemon_id = $id
                                                        ORDER BY pokemon_abilities.slot
                                                     """, $id: e.species_id),
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
                                    db.getAsync("SELECT natures.increased_stat_id, natures.decreased_stat_id FROM natures JOIN nature_names ON natures.id = nature_names.nature_id AND LOWER(nature_names.name) = $nature", $nature: m[1])
                                    .then((nature) ->
                                        calcStats(level, nature.increased_stat_id, nature.decreased_stat_id, evs)
                                    )
                                else
                                    calcStats(level, 2, 2, evs)
                            )
                    else
                        "'#{command.args[0]}' is not a valid Pokémon."
                )

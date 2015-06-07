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
                    db.getAsync("SELECT move_id, name FROM move_names WHERE local_language_id = 9 AND move_id = (SELECT move_id FROM move_names WHERE LOWER(name) = $movename)", $movename: movename.toLowerCase()),
                    db.getAsync("SELECT pokemon_species_id, name FROM pokemon_species_names WHERE local_language_id = 9 AND pokemon_species_id = (SELECT pokemon_species_id FROM pokemon_species_names where LOWER(name) = $name)", $name: pokemonname.toLowerCase()),
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
                                       (SELECT ability_id FROM ability_names WHERE LOWER(name) = $ability)
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
                               WHERE moves.id = (SELECT move_id FROM move_names WHERE LOWER(name) = $movename)
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

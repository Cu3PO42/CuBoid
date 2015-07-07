SELECT name,
       ? AS pokemonname,
       group_concat(versions_level_method_string
                    ORDER BY version_group_id separator ", ") AS method_string
FROM
    (SELECT name,
            min(version_group_id) AS version_group_id,
            concat(CASE WHEN pokemon_move_method_id = 1
                        THEN concat("at level ", LEVEL, " ")
                        ELSE ""
                   END, concat("in ", group_concat(method_string separator ", "))) AS versions_level_method_string
     FROM
         (SELECT pokemon_move_method_prose.name,
                 pokemon_moves.version_group_id,
                 pokemon_moves.pokemon_move_method_id,
                 group_concat(DISTINCT pokemon_moves.LEVEL
                              ORDER BY pokemon_moves.LEVEL separator '/') AS LEVEL,
                 group_concat(DISTINCT version_names.name
                              ORDER BY version_names.version_id separator '/') AS method_string
          FROM pokemon_move_method_prose
          JOIN pokemon_moves ON pokemon_moves.pokemon_move_method_id = pokemon_move_method_prose.pokemon_move_method_id
          AND pokemon_moves.move_id = ?
          AND pokemon_moves.pokemon_id IN
              (SELECT id
               FROM pokemon
               WHERE species_id = ?)
          JOIN versions ON versions.version_group_id = pokemon_moves.version_group_id
          JOIN version_names ON versions.id = version_names.version_id
          AND version_names.local_language_id = 9
          WHERE pokemon_move_method_prose.local_language_id = 9
          GROUP BY pokemon_moves.pokemon_move_method_id,
                   pokemon_moves.version_group_id) AS methods
     GROUP BY `name`,
              `level`) AS version_level_group_methods
GROUP BY `name`

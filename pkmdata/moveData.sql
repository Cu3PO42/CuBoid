SELECT move_names.name AS move_name,
       move_damage_classes.identifier AS damage_class,
       type_names.name AS type_name,
       moves.power,
       moves.accuracy,
       moves.pp,
       moves.priority,
       move_effect_prose.short_effect,
       move_meta.meta_category_id,
       move_meta.ailment_chance,
       move_meta.flinch_chance,
       move_meta.stat_chance,
       move_target_prose.name AS target
FROM moves
JOIN move_names ON move_names.move_id = moves.id
AND move_names.local_language_id = 9
JOIN move_damage_classes ON move_damage_classes.id = moves.damage_class_id
JOIN type_names ON moves.type_id = type_names.type_id
AND type_names.local_language_id = 9
JOIN move_effect_prose ON moves.effect_id = move_effect_prose.move_effect_id
AND move_effect_prose.local_language_id = 9
JOIN move_meta ON moves.id = move_meta.move_id
JOIN move_target_prose ON moves.target_id = move_target_prose.move_target_id
AND move_target_prose.local_language_id = 9
WHERE moves.id =
        (SELECT DISTINCT move_id
         FROM move_names
         WHERE name = ?)

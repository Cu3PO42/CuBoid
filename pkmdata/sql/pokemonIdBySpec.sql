SELECT DISTINCT pokemon_id as id
FROM pokemon_moves
JOIN move_names ON pokemon_moves.move_id = move_names.move_id
WHERE move_names.name = ?
UNION ALL
SELECT DISTINCT pokemon_id as id
FROM pokemon_abilities
JOIN ability_names ON pokemon_abilities.ability_id = ability_names.ability_id
WHERE ability_names.name = ?
UNION ALL
SELECT pokemon_id as id
FROM pokemon_types
JOIN type_names ON pokemon_types.type_id = type_names.type_id
WHERE type_names.name = ?

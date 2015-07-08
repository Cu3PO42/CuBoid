SELECT DISTINCT pokemon_id as id
FROM pokemon_moves
JOIN move_names ON pokemon_moves.move_id = move_names.move_id
WHERE move_names.name = ?
UNION ALL
SELECT DISTINCT pokemon.id
FROM pokemon_moves
JOIN move_names ON pokemon_moves.move_id = move_names.move_id
JOIN pokemon_species ON pokemon_species.evolves_from_species_id = pokemon_moves.pokemon_id
JOIN pokemon ON pokemon.species_id = pokemon_species.id
WHERE move_names.name = ?
UNION ALL
SELECT DISTINCT pokemon.id
FROM pokemon_moves
JOIN move_names ON pokemon_moves.move_id = move_names.move_id
JOIN pokemon_species AS pokemon_one ON pokemon_one.evolves_from_species_id = pokemon_moves.pokemon_id
JOIN pokemon_species AS pokemon_two ON pokemon_two.evolves_from_species_id = pokemon_one.id
JOIN pokemon ON pokemon.species_id = pokemon_two.id
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

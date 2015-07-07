SELECT DISTINCT type_names.name
FROM pokemon_types
JOIN pokemon_species_names ON pokemon_species_names.pokemon_species_id = pokemon_types.pokemon_id
AND pokemon_species_names.name = ?
JOIN type_names ON type_names.type_id = pokemon_types.type_id
AND type_names.local_language_id = 9
ORDER BY pokemon_types.slot

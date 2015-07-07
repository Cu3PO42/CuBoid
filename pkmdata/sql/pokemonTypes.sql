SELECT type_names.name
FROM pokemon_types
JOIN type_names ON type_names.type_id = pokemon_types.type_id
AND type_names.local_language_id = 9
WHERE pokemon_types.pokemon_id = ?
ORDER BY pokemon_types.slot

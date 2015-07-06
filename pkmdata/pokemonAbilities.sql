SELECT ability_names.name,
       pokemon_abilities.is_hidden,
       pokemon_abilities.slot
FROM pokemon_abilities
JOIN ability_names ON ability_names.ability_id = pokemon_abilities.ability_id
AND ability_names.local_language_id = 9
WHERE pokemon_abilities.pokemon_id = ?
ORDER BY pokemon_abilities.slot

SELECT egg_group_prose.name
FROM pokemon_egg_groups
JOIN egg_group_prose ON pokemon_egg_groups.egg_group_id = egg_group_prose.egg_group_id
AND egg_group_prose.local_language_id = 9
WHERE pokemon_egg_groups.species_id = ?

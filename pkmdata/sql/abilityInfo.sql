SELECT ability_names.name,
       ability_prose.effect
FROM ability_prose
JOIN ability_names ON ability_prose.ability_id = ability_names.ability_id
    AND ability_names.ability_id =
        (SELECT DISTINCT ability_id
         FROM ability_names
         WHERE name = ?)
WHERE ability_prose.local_language_id = 9
    AND ability_names.local_language_id = 9

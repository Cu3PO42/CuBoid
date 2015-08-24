SELECT name
FROM ability_names
WHERE local_language_id = ?
    AND ability_id =
        (SELECT DISTINCT ability_id
         FROM ability_names
         WHERE name = ?)
UNION ALL
SELECT name
FROM item_names
WHERE local_language_id = ?
    AND item_id =
        (SELECT DISTINCT item_id
         FROM item_names
         WHERE name = ?)
UNION ALL
SELECT name
FROM move_names
WHERE local_language_id = ?
    AND move_id =
        (SELECT DISTINCT move_id
         FROM move_names
         WHERE name = ?)
UNION ALL
SELECT name
FROM pokemon_species_names
WHERE local_language_id = ?
    AND pokemon_species_id =
        (SELECT DISTINCT pokemon_species_id
         FROM pokemon_species_names
         WHERE name = ?)

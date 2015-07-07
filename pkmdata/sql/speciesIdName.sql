SELECT pokemon_species_id,
       name
FROM pokemon_species_names
WHERE local_language_id = 9
    AND pokemon_species_id =
        (SELECT DISTINCT pokemon_species_id
         FROM pokemon_species_names
         WHERE ? LIKE concat(name, ' %'))

SELECT pokemon.species_id,
       pokemon_species_names.name,
       pokemon_species.gender_rate,
       pokemon_species.hatch_counter
FROM pokemon
JOIN pokemon_species_names ON pokemon.species_id = pokemon_species_names.pokemon_species_id
AND pokemon_species_names.local_language_id = 9
JOIN pokemon_species ON pokemon.species_id = pokemon_species.id
WHERE pokemon.species_id =
        (SELECT DISTINCT pokemon_species_id
         FROM pokemon_species_names
         WHERE name = ?)

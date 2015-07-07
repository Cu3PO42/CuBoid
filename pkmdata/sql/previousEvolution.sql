SELECT pokemon_species.evolves_from_species_id,
       pokemon_species_names.name
FROM pokemon_species
LEFT JOIN pokemon_species_names ON pokemon_species_names.pokemon_species_id = pokemon_species.evolves_from_species_id
AND pokemon_species_names.local_language_id = 9
WHERE pokemon_species.id = ?

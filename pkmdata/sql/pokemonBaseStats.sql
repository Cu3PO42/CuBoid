SELECT pokemon_species_names.name,
       pokemon.species_id,

    (SELECT base_stat
     FROM pokemon_stats
     WHERE stat_id = 1
         AND pokemon_id = pokemon.species_id) AS hp,

    (SELECT base_stat
     FROM pokemon_stats
     WHERE stat_id = 2
         AND pokemon_id = pokemon.species_id) AS atk,

    (SELECT base_stat
     FROM pokemon_stats
     WHERE stat_id = 3
         AND pokemon_id = pokemon.species_id) AS def,

    (SELECT base_stat
     FROM pokemon_stats
     WHERE stat_id = 4
         AND pokemon_id = pokemon.species_id) AS spatk,

    (SELECT base_stat
     FROM pokemon_stats
     WHERE stat_id = 5
         AND pokemon_id = pokemon.species_id) AS spdef,

    (SELECT base_stat
     FROM pokemon_stats
     WHERE stat_id = 6
         AND pokemon_id = pokemon.species_id) AS spd
FROM pokemon
JOIN pokemon_species_names ON pokemon_species_names.pokemon_species_id = pokemon.species_id
AND pokemon_species_names.local_language_id = 9
WHERE pokemon.species_id =
        (SELECT DISTINCT pokemon_species_id
         FROM pokemon_species_names
         WHERE ? LIKE concat(name, '%'))

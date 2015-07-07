SELECT pokemon.id,

    (SELECT base_stat
     FROM pokemon_stats
     WHERE stat_id = 1
         AND pokemon_id = pokemon.id) AS hp,

    (SELECT base_stat
     FROM pokemon_stats
     WHERE stat_id = 2
         AND pokemon_id = pokemon.id) AS atk,

    (SELECT base_stat
     FROM pokemon_stats
     WHERE stat_id = 3
         AND pokemon_id = pokemon.id) AS def,

    (SELECT base_stat
     FROM pokemon_stats
     WHERE stat_id = 4
         AND pokemon_id = pokemon.id) AS spatk,

    (SELECT base_stat
     FROM pokemon_stats
     WHERE stat_id = 5
         AND pokemon_id = pokemon.id) AS spdef,

    (SELECT base_stat
     FROM pokemon_stats
     WHERE stat_id = 6
         AND pokemon_id = pokemon.id) AS spd,

    (SELECT DISTINCT pokemon_species_names.name
     FROM pokemon_species_names
     WHERE pokemon_species_id = pokemon.id
         AND pokemon_species_names.local_language_id = 9
     UNION ALL SELECT DISTINCT pokemon_form_names.pokemon_name AS name
     FROM pokemon_forms
     JOIN pokemon_form_names ON pokemon_form_names.pokemon_form_id = pokemon_forms.id
     WHERE pokemon_forms.pokemon_id = pokemon.id
         AND pokemon_form_names.local_language_id = 9 LIMIT 1) AS name
FROM pokemon
JOIN pokemon_species_names ON pokemon_species_names.pokemon_species_id = pokemon.species_id
AND pokemon_species_names.local_language_id = 9
WHERE pokemon.id =
        (SELECT DISTINCT pokemon_species_id AS id
         FROM pokemon_species_names
         WHERE concat(?, ' ') LIKE concat(name, ' %')
         UNION ALL SELECT DISTINCT pokemon_forms.pokemon_id AS id
         FROM pokemon_forms
         JOIN pokemon_form_names ON pokemon_form_names.pokemon_form_id = pokemon_forms.id
         WHERE concat(?, ' ') LIKE concat(pokemon_form_names.pokemon_name, ' %') LIMIT 1)

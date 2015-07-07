SELECT concat(pokemon.species_id, "-", CASE WHEN pokemon_forms.is_mega THEN 0 ELSE pokemon_forms.form_order-1 END) AS id
FROM
    (SELECT pokemon_form_id AS id,
            pokemon_name AS name
     FROM pokemon_form_names
     UNION SELECT pokemon_species_id AS id,
                  name
     FROM pokemon_species_names) AS pokemon_names
JOIN pokemon_forms ON pokemon_names.id = pokemon_forms.id
JOIN pokemon ON pokemon.id = pokemon_forms.pokemon_id
WHERE name = ?

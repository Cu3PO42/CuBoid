SELECT name
FROM pokemon_species_names
WHERE pokemon_species_id = ?
    AND local_language_id = 9
UNION ALL
SELECT pokemon_name AS name
FROM pokemon_form_names
JOIN pokemon_forms ON pokemon_forms.id = pokemon_form_names.pokemon_form_id
WHERE pokemon_forms.pokemon_id = ?
    AND pokemon_form_names.local_language_id = 9

SELECT DISTINCT type_names.name
FROM pokemon_types
JOIN type_names ON type_names.type_id = pokemon_types.type_id
AND type_names.local_language_id = 9
WHERE pokemon_types.pokemon_id =
        (SELECT DISTINCT pokemon_species_id AS id
         FROM pokemon_species_names
         WHERE ? LIKE concat(name, '%')
         UNION ALL SELECT DISTINCT pokemon_forms.pokemon_id AS id
         FROM pokemon_forms
         JOIN pokemon_form_names ON pokemon_form_names.pokemon_form_id = pokemon_forms.id
         WHERE ? LIKE concat(pokemon_form_names.pokemon_name, '%') LIMIT 1)
ORDER BY pokemon_types.slot

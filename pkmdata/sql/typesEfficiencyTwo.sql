SELECT type_names.name,
       (type_one.damage_factor * type_two.damage_factor / 100) AS damage_factor
FROM type_efficacy AS type_one
JOIN type_efficacy AS type_two ON type_one.damage_type_id = type_two.damage_type_id
JOIN type_names ON type_one.damage_type_id = type_names.type_id
AND type_names.local_language_id = 9
WHERE type_one.target_type_id =
        (SELECT DISTINCT type_id
         FROM type_names
         WHERE name = ?)
    AND type_two.target_type_id =
        (SELECT DISTINCT type_id
         FROM type_names
         WHERE name = ?)
ORDER BY damage_factor ASC

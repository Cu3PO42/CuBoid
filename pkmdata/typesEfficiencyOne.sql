SELECT type_names.name,
       type_efficacy.damage_factor
FROM type_efficacy
JOIN type_names ON type_efficacy.damage_type_id = type_names.type_id
AND type_names.local_language_id = 9
WHERE type_efficacy.target_type_id =
        (SELECT DISTINCT type_id
         FROM type_names
         WHERE name = ?)
ORDER BY damage_factor ASC

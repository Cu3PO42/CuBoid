SELECT
    (SELECT name
     FROM type_names
     WHERE type_id = type_efficacy.damage_type_id
         AND local_language_id = 9) AS name_one,

    (SELECT name
     FROM type_names
     WHERE type_id = type_efficacy.target_type_id
         AND local_language_id = 9) AS name_two,
       type_efficacy.damage_factor
FROM type_efficacy
JOIN type_names AS type_one ON type_one.type_id = type_efficacy.damage_type_id
AND type_one.local_language_id = 9
JOIN type_names AS type_two ON type_two.type_id = type_efficacy.target_type_id
AND type_two.local_language_id = 9
WHERE type_efficacy.damage_type_id =
        (SELECT DISTINCT type_id
         FROM type_names
         WHERE name = ?)
    AND type_efficacy.target_type_id =
        (SELECT DISTINCT type_id
         FROM type_names
         WHERE name = ?)

SELECT short_effect,
       name
FROM item_prose
JOIN item_names ON item_prose.item_id = item_names.item_id
AND item_names.local_language_id = 9
WHERE item_prose.item_id =
        (SELECT DISTINCT item_id
         FROM item_names
         WHERE name = ?)
AND item_prose.local_language_id = 9

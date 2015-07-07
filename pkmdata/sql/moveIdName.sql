SELECT move_id,
       name
FROM move_names
WHERE local_language_id = 9
    AND move_id =
        (SELECT DISTINCT move_id
         FROM move_names
         WHERE ? LIKE concat('% ', name)
         ORDER BY length(name) DESC LIMIT 1)

SELECT pokemon_id AS id
FROM pokemon_stats
WHERE stat_id = ?
    AND base_stat %s ?

SELECT natures.increased_stat_id,
       natures.decreased_stat_id
FROM natures
JOIN nature_names ON natures.id = nature_names.nature_id
AND (? LIKE concat('% ', nature_names.name, ' %')) OR (? LIKE concat('% ', nature_names.name))

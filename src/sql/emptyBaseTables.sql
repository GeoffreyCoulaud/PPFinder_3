-- Empty base tables then clear unused space
DELETE FROM 'accuraciesMetadata';
DELETE FROM 'beatmapsMetadata';
DELETE FROM 'modsMetadata';
VACUUM;
-- Empty base tables then clear unused space

DELETE FROM beatmapsMetadata;
DELETE FROM modsMetadata;
DELETE FROM accuraciesMetadata;
VACUUM;
-- Empty base tables then clear unused space
DELETE FROM `accuraciesmetadata`;
DELETE FROM `beatmapsmetadata`;
DELETE FROM `modsmetadata`;

-- Set auto_increment to start
ALTER TABLE `accuraciesmetadata` AUTO_INCREMENT = 1;
ALTER TABLE `beatmapsmetadata` AUTO_INCREMENT = 1;
ALTER TABLE `modsmetadata` AUTO_INCREMENT = 1;
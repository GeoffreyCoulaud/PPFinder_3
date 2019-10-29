-- Drop the existing tables (if there)
DROP TABLE IF EXISTS 'accuraciesmetadata';
DROP TABLE IF EXISTS 'beatmapsmetadata';
DROP TABLE IF EXISTS 'modsmetadata';

-- Structure for table 'beatmapsmetadata'
CREATE TABLE 'beatmapsmetadata' (
    'ID'            int(11)      PRIMARY KEY NOT NULL AUTO_INCREMENT,
    'beatmapID'     int(11)      NOT NULL,
    'maxCombo'      int(11)      NOT NULL,
    'beatmapSetID'  int(11)      DEFAULT NULL,
    'creator'       varchar(255) DEFAULT NULL,
    'version'       varchar(255) DEFAULT NULL,
    'artist'        varchar(255) DEFAULT NULL,
    'title'         varchar(255) DEFAULT NULL,
    'artistUnicode' varchar(255) DEFAULT NULL,
    'titleUnicode'  varchar(255) DEFAULT NULL,

    CONSTRAINT 'U_bID' UNIQUE ('beatmapID')
);

-- Structure for table 'modsmetadata'
CREATE TABLE 'modsmetadata' (
    'ID'        int(11) PRIMARY KEY NOT NULL AUTO_INCREMENT,
    'beatmapID' int(11) NOT NULL,
    'modbits'   bit(10) NOT NULL,
    'stars'     float   DEFAULT NULL,
    'ar'        float   DEFAULT NULL,
    'cs'        float   DEFAULT NULL,
    'od'        float   DEFAULT NULL,
    'hp'        float   DEFAULT NULL,
    'duration'  int(11) DEFAULT NULL,
    'bpm'       int(11) DEFAULT NULL
);

-- Structure for table 'accuraciesmetadata'
CREATE TABLE 'accuraciesmetadata' (
    'ID'        int(11) PRIMARY KEY NOT NULL AUTO_INCREMENT,
    'beatmapID' int(11) NOT NULL,
    'accuracy'  int(7)  NOT NULL,
    'modbits'   bit(10) DEFAULT NULL,
    'pp'        float   DEFAULT NULL
);

-- Index on table accuracy (faster searching)
CREATE INDEX 'accuracy' ON 'accuraciesmetadata' ('accuracy' DESC, 'beatmapID' DESC, 'modbits'); 
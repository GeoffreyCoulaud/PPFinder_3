-- Creating base tables

CREATE TABLE beatmapsMetadata (
    'ID' INTEGER PRIMARY KEY AUTOINCREMENT,
    
    'beatmapID' INTEGER NOT NULL UNIQUE,

    'beatmapSetID' INTEGER,
    'creator' VARCHAR(255),
    'version' VARCHAR(255),
    'artist' VARCHAR(255),
    'title' VARCHAR(255),
    'artistUnicode' VARCHAR(255),
    'titleUnicode' VARCHAR(255)
);

CREATE TABLE modsMetadata (
    'ID' INTEGER PRIMARY KEY AUTOINCREMENT,
    
    'beatmapID' INTEGER NOT NULL,
    'mods' VARCHAR(20),

    'stars' FLOAT,
    'ar' FLOAT,
    'cs' FLOAT,
    'od' FLOAT,
    'hp' FLOAT
);

CREATE TABLE accuraciesMetadata (
    'ID' INTEGER PRIMARY KEY AUTOINCREMENT,
    
    'beatmapID' INTEGER NOT NULL,
    'mods' VARCHAR(20),

    'accuracy' INTEGER(7),
    'pp' FLOAT
);
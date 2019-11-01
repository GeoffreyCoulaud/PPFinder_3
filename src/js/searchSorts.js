// * SQL sorts to use when searching the database
const sorts = [
    'acc100.pp',                // Sort by PP
    'm.stars',                  // Sort by Stars
    'acc100.pp / m.stars',      // Sort by PP / Stars
    'b.maxCombo',               // Sort by Combo
    'acc100.pp / b.maxCombo',   // Sort by PP / Note
    'm.duration',               // Sort by Duration
    'acc100.pp / m.duration'    // Sort by PP / Minute
];

module.exports = sorts;
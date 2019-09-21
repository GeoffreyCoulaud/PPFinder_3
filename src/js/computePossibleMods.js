/*
    --- WARNING ---
    Because of the recursive nature of the "combos" function,
    the nodeJs environnement may throw an exception (stack too large).
    You can fix this by either : 
    - Making the stack limit higher
    - Running this script in a web browser (what I did)
    To run in a browser : 
    - open the console of your browser (press F12),
    - copy and paste the contents of this file in the console of your browser 
    - the result is given as a JSON string in the console.
    To run in nodeJs : 
    - no fucking idea lol
    --------------- 

    This script generates all possible mod combinations supported by pp finder.
    (All the mods combinations possible that affect PP by their presence)
    
    To change supported mods, add options to originalPool.
    
    To add custom invalid combinations, add a regular expression to impossibleMatch. 
    If a string matches one (or more) of the RegExp-s it's filtered out of the outcome.
*/

const originalPool = ['HD', 'HR', 'DT', 'FL', 'EZ', 'HT', 'NF', 'SO'];
const impossibleMatch = [
    new RegExp('HR.*EZ'),
    new RegExp('DT.*HT')
];
let allOptions = [''];

// Get all str combinations possible recursively
function combinations(current, pool){
    // If the pool has already been emptied, stop
    if (pool.length === 0){ 
        return; 
    }
    // Get all the possible combinations, the pool is not empty
    for (let i = 0; i<pool.length; i++){
        let newCurrent = current+pool[i]; 
        let newPool = JSON.parse(JSON.stringify(pool));
        newPool.splice(0, i+1);
        allOptions.push(newCurrent);
        combinations(newCurrent, newPool);
    }
}
combinations('', originalPool);

// Remove all impossible combinations
function possible(str){
    for (let i of impossibleMatch){
        if (i.test(str)){
            return false;
        }
    }
    return true;
}
allOptions = allOptions.filter(possible);

// Log the result as JSON
console.log(`${allOptions.length} options computed.`);
console.log(JSON.stringify(allOptions));
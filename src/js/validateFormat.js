class Format{
    constructor(type){
        this.type = type
    }
}
class AnyFormat extends Format{
    constructor(){
        super('object');
        this.match = function(obj){
            return (typeof obj !== 'undefined'); 
        }
    }
}
class SpecificValueFormat extends Format{
    constructor(value){
        super(typeof value);
        this.value = value;
        this.match = function(obj){
            return obj === this.value;
        }
    }
}
class BoolFormat extends Format{
    constructor(){
        super('boolean');
        this.match = function(obj){
            return (obj === true || obj === false); 
        }
    }
}
class NumberFormat extends Format{
    constructor(min, max, forceInt = false){
        super('number');
        this.min = min;
        this.max = max;
        this.forceInt = forceInt;
        this.match = function(obj){
            if (typeof obj !== 'number'){return false;}
            if (Number.isNaN(obj)){return false;}
            if (this.forceInt && !Number.isInteger(obj)){return false;}
            if (obj < min){return false;}
            if (obj > max){return false;}
            return true;
        }
    }
}
class StringFormat extends Format{
    constructor(size){
        super('string');
        this.size = size;
        this.match = function(obj){
            if (typeof obj !== 'string'){return false;}
            if (typeof this.size === 'number'){
                if (obj.length !== this.size){return false;}
            } else {
                if (obj.length < this.size.min){return false;}
                if (obj.length > this.size.max){return false;}
            }
            return true;
        }
    }
}
class ArrayFormat extends Format{
    constructor(size = null){
        super('array');
        this.size = size;
        this.match = function(obj){
            if (!Array.isArray(obj)){return false;}
            if (this.size === null){return true;} 
            else if (typeof this.size === 'number' && obj.length !== this.size){return false;} 
            else if (obj.length < this.size.min || obj.length > this.size.max){return false;}
            return true;
        }
    }
}
class ArrayOfFormat extends Format{
    constructor(format, size = null){
        super('array');
        this.size = size;
        this.insideFormat = format;
        this.match = function(obj){
            if (!Array.isArray(obj)){return false;}
            let sizeCond = false;
            if (this.size === null){sizeCond = true;}
            else if (typeof this.size === 'number' && this.size === obj.length){sizeCond = true;}
            else if (obj.length >= this.size.min || obj.length <= this.size.max){sizeCond = true;}
            if (!sizeCond){return false;}
            for (let item of obj){
                if (!this.insideFormat.match(item)){return false;};
            }
            return true;
        }
    }
}
class OrFormat extends Format{
    constructor(){
        super('object');
        this.formats = Array.from(arguments);
        this.match = function(obj){
            this.formats.forEach((format)=>{if(format.match(obj)){return true;}});
            return false;
        }
    }
}

function validate(obj, model){
    // If format is a Format
    if (model instanceof Format){
        // Test if obj matches format
        return model.match(obj);
    } 

    // If format is not a Format
    else {
        // Go through the properties (recusively if needed)
        for (let {key, subFormat} of Object.entries(model)){
            // If key doesn't exist in obj, return false
            if (typeof obj[key] === 'undefined'){return false;}
            // If key exists, validate its content to the subFormat
            return validate(obj[key], subFormat);
        }
    } 
}

module.exports = {
    validate: validate,
    AnyFormat: AnyFormat,
    SpecificValueFormat: SpecificValueFormat,
    BoolFormat: BoolFormat,
    NumberFormat: NumberFormat,
    StringFormat: StringFormat,
    ArrayFormat: ArrayFormat,
    ArrayOfFormat: ArrayOfFormat,
    OrFormat: OrFormat,
    Format: Format
}
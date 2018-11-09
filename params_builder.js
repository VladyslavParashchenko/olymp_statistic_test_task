
module.exports = function (params){
    let chartType = params.shift();
    let objectWithParams = processInputParamsByChartType(params, chartType);
    objectWithParams['char_type'] = chartType;
    return objectWithParams;
}

function processInputParamsByChartType(params, chartType){
    let values = {};
    switch(chartType){
        case 'medals':
            values['season'] = getEnumByValue(getValueFromParams(params, ['winter', 'summer']));
            values['medal'] = getEnumByValue(getValueFromParams(params, ['gold', 'silver','bronze']));
            values['noc_name'] = params[0];
            console.log(params);
            return values;
        case 'top-teams':
            values['season'] = getEnumByValue(getValueFromParams(params, ['winter', 'summer']));
            values['medal'] = getEnumByValue(getValueFromParams(params, ['gold', 'silver', 'bronze']));
            values['year'] = params[0] || null;
            console.log(params);
            return values;
    
    }    
}

function getValueFromParams(params, possibleValues) {
    let valueFromParams = null;
    possibleValues.forEach(value => {
        valueFromParams = isValuePresentInParams(params, value) ? value : valueFromParams;
    });
    return valueFromParams;
}

function isValuePresentInParams(params, value){
    let index = params.indexOf(value);
    if (index != -1){
        params.splice(index, 1);
        return true;
    }else{
        return false;
    }
}

function getEnumByValue(value){
    switch(value){
        case 'summer': return 0;
        case 'winter': return 1;
        case 'bronze': return 3;
        case 'silver': return 2;
        case 'gold': return 1;
    }
}
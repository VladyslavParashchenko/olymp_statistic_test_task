'use strict';
let paramsBuilder = require('./params_builder');
let ChartBuilder = require('./chart_builder.js');
let params = process.argv.slice(2);
params = paramsBuilder(params);
let chart = new ChartBuilder(params).buildChartByDataFromDB();

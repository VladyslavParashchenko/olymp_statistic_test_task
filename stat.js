'use strict'
let paramsBuilder = require('./params_builder')
let ChartBuilder = require('./chart_builder.js')
let params = process.argv.slice(2)
try {
  params = paramsBuilder(params)
  new ChartBuilder(params).buildChartByDataFromDB()
} catch (err) {
  console.log(err)
}

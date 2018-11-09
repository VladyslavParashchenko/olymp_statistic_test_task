"use strict";
const DB = require("./db");
module.exports = class ChartBuilder {
  constructor(chartParams) {
    this.chartParams = chartParams;
    this.db = new DB();
  }

  buildChartByDataFromDB() {
    this.dataFromDb = this.db.selectMedalsStat(this.chartParams);
    console.log(this.dataFromDb);
    let db_request = this.db.selectMaxMedalsStat();
    console.log(db_request);
    this.display();
  }
  display() {}

  handleDataFromDb() {
    let maxRelaviteValue = 200  
    this.dataFromDb = this.dataFromDb.map(function(item) {
        let relativeValue = Math.ceil((item["count"] * maxRelaviteValue)/this.maxValue);
        item['relative_value'] = relativeValue;
        return item;
    });
    console.log(this.dataFromDb);
  }
};

"use strict";
const DB = require("./db");
module.exports = class ChartBuilder {
  constructor(chartParams) {
    this.chartParams = chartParams;
    this.db = new DB();
    this.maxValue;
  }

  buildChartByDataFromDB() {
    this.dataFromDb = this.db.selectMedalsStat(this.chartParams)
      .then(
        response => {
          this.dataFromDb = response;
          return this.db.selectMaxMedalsStat();
        }
      )
      .then(
        response => {
          console.log(response[0]['max_count']);
          this.maxValue = response[0]['max_count'];
          return this.handleDataFromDb();
        }
      ).catch(
        error => console.log(error.message)
      );
  }
  display() {
    this.dataFromDb.forEach(item => {
      console.log(item['year']+ ''.padEnd(' ', 5)+''.padStart(item['relative_value'], '-'));
    });
  }

  handleDataFromDb() {
    let maxRelaviteValue = 200;
    this.dataFromDb = this.dataFromDb.map((item) => {
      let relativeValue = Math.ceil((item["count"] * maxRelaviteValue) / this.maxValue);
      item['relative_value'] = relativeValue;
      return item;
    });
    console.log(this.dataFromDb);
    this.display();
  }
};

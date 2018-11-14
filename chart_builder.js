'use strict';

const DB = require('./db');
module.exports = class ChartBuilder {
  constructor (chartParams) {
    this.chartParams = chartParams;
    this.db = this.chartParams['chart_type'] === 'medals' ? (new DB.MedalsStatDB()) : (new DB.TopTeamsStatDB());
  }

  buildChartByDataFromDB () {
    this.dataFromDb = this.db.selectStat(this.chartParams)
      .then(
        response => {
          this.dataFromDb = response;
          console.log(this.dataFromDb);
          if (this.dataFromDb.length === 0) {
            throw new Error('Empty');
          }
          return this.db.selectMaxAmountStat(this.chartParams);
        }
      )
      .then(
        response => {
          this.maxValue = response[0]['max_count'];
          return this.handleDataFromDb();
        }
      ).catch(error => console.log(error.message));
  }

  display () {
    this.displayChartTitle();
    this.dataFromDb.forEach(item => {
      let firstColumn = item['item'] + '\t';
      let secondColumn;
      if (item['count'] === 0) {
        console.log(firstColumn);
      } else {
        secondColumn = ' '.repeat(item['relative_value']);
        console.log(firstColumn, '\x1b[41m', secondColumn, '\x1b[0m', item['count']);
      }
    });
  }

  handleDataFromDb () {
    const maxRelativeValue = 150;
    this.dataFromDb = this.dataFromDb.map((item) => {
      let relativeValue = Math.ceil((item['count'] * maxRelativeValue) / this.maxValue);
      item['relative_value'] = relativeValue;
      return item;
    });
    this.display();
  }

  displayChartTitle () {
    switch (this.chartParams['char_type']) {
      case 'medals':
        console.log('Year', '\t', 'Amount');
        return;
      case 'top-teams':
        console.log('NOC', '\t', 'Amount');
    }
  }
};

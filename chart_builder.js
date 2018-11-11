"use strict";
const DB = require("./db");
module.exports = class ChartBuilder {
    constructor(chartParams) {
        this.chartParams = chartParams;

        this.db = this.chartParams['char_type'] == 'medals' ? (new DB.MedalsStatDB()) : (new DB.TopTeamsStatDB());
        this.maxValue;
    }

    buildChartByDataFromDB() {
        this.dataFromDb = this.db.selectStat(this.chartParams)
            .then(
                response => {
                    this.dataFromDb = response;
                    if (this.dataFromDb.length == 0) {
                        throw 'Empty';
                    }
                    return this.db.selectMaxAmountStat(this.chartParams);
                }
            )
            .then(
                response => {
                    this.maxValue = response[0]['max_count'];
                    return this.handleDataFromDb();
                }
            ).catch(
                error => console.log(error)
            );
    }

    display() {
        this.displayChartTitle();
        this.dataFromDb.forEach(item => {
            let firstColumn = item['item'] + '     ';
            let secondColumn;
            if (item['relative_value'] == 0) {
                console.log(firstColumn);
            } else {
                secondColumn = ' '.repeat(item['relative_value']);
                console.log(firstColumn, '\x1b[41m', secondColumn, '\x1b[0m');
            }

        });
    }

    handleDataFromDb() {
        let maxRelaviteValue = 150;
        this.dataFromDb = this.dataFromDb.map((item) => {
            let relativeValue = Math.ceil((item["count"] * maxRelaviteValue) / this.maxValue);
            item['relative_value'] = relativeValue;
            return item;
        });
        this.display();
    }

    displayChartTitle() {
        switch (this.chartParams['char_type']) {
            case 'medals':
                console.log('Year', '     ', 'Amount');
                return;
            case 'top-teams':
                console.log('NOC', '     ', 'Amount');
                return;
        }
    }
};

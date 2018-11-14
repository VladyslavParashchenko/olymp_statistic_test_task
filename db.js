'use strict';

let sqlite3 = require('sqlite3').verbose();
let dbFileName = 'olympic_history.db';
class DB {
  constructor () {
    this.db = new sqlite3.Database(dbFileName);
  }

  runQuery (query) {
    console.log(query);
    return new Promise((resolve, reject) => {
      this.db.all(query, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  buildRestictionsByParams (params) {
    let restrictions = [];
    for (let key in params) {
      if (key !== 'chart_type' && params[key] !== null && params[key] !== undefined) {
        if (Array.isArray(params[key])) {
          let subRestriction = params[key].map((item) => {
            return `${key}="${item}"`;
          }).join(' or ');
          restrictions.push(`(${subRestriction})`);
        } else {
          restrictions.push(`${key}="${params[key]}"`);
        }
      }
    }
    console.log(restrictions);
    return restrictions.length !== 0
      ? `where ${restrictions.join(' and ')}`
      : '';
  }

  buildRestictionsByParam (params, paramName) {
    return params[paramName] === null
      ? ''
      : `where ${paramName}='${params[paramName]}'`;
  }
}

class MedalsStatDB extends DB {
  selectStat (params) {
    let sql = `SELECT  year item, count(*) count FROM games g JOIN results r on g.id=r.game_id JOIN athletes a on a.id=r.athlete_id 
    JOIN teams t on t.id=a.team_id ${this.buildRestictionsByParams(params)}  GROUP BY year;`;
    return this.runQuery(sql);
  }

  selectMaxAmountStat (params) {
    let sql = `SELECT  item, max(count) max_count from(SELECT  year item, count(*) count FROM games g JOIN results r on g.id=r.game_id JOIN athletes a on a.id=r.athlete_id 
    JOIN teams t on t.id=a.team_id ${this.buildRestictionsByParams(params)}  GROUP BY year);`;
    return this.runQuery(sql);
  }
}

class TopTeamsStatDB extends DB {
  selectStat (params) {
    let sql = `SELECT item, count FROM (SELECT  noc_name item, count(t.id) count FROM games g JOIN results r on g.id=r.game_id JOIN athletes a on a.id=r.athlete_id 
      JOIN teams t on t.id=a.team_id  ${this.buildRestictionsByParams(params)} 
      GROUP BY noc_name order by count desc) ;`;
    return this.runQuery(sql);
  }

  selectMaxAmountStat (params) {
    let sql = `SELECT noc_name item, max(count) max_count FROM (SELECT  noc_name, count(t.id) count FROM games g JOIN results r on g.id=r.game_id JOIN athletes a on a.id=r.athlete_id 
      JOIN teams t on t.id=a.team_id  ${this.buildRestictionsByParams(params)} 
      GROUP BY noc_name);`;
    return this.runQuery(sql);
  }
}

module.exports = {
  MedalsStatDB,
  TopTeamsStatDB
};

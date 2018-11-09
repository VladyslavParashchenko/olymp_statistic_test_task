let sqlite3 = require("sqlite3").verbose();
let db_file_name = "olympic_history.db";

module.exports = class DB {
  constructor() {
    this.db = new sqlite3.Database(db_file_name);
  }

  runQuery(query) {
    return new Promise((resolve, reject) =>{
      this.db.all(query, (err, rows) => {
        if (err) {
          reject(err);
          // console.log(err.message);
        } else {
          // console.log(rows);
          resolve(rows);
        }
      });
    });
  }

  selectMedalsStat(params) {
    let sql = `SELECT  year, count(r.id) count FROM games g LEFT JOIN results r on g.id=r.game_id LEFT JOIN athletes a on a.id=r.athlete_id 
    LEFT JOIN teams t on t.id=a.team_id  ${this.buildRestictionsByParams(
        params
      )} GROUP BY year order by year desc;`;
    console.log(sql);
    return this.runQuery(sql);
  }

  selectMaxMedalsStat(params) {
    let sql = `SELECT max(count) max_count from(SELECT  year, count(*) count FROM games g LEFT JOIN results r on g.id=r.game_id LEFT JOIN athletes a on a.id=r.athlete_id 
    LEFT JOIN teams t on t.id=a.team_id  ${this.buildRestictionsByParams(
        params
      )} GROUP BY year order by year desc);`;
    console.log(sql);
    return this.runQuery(sql);
  }

  buildRestictionsByParams(params) {
    console.log(params);
    let restrictions = [];
    for (let key in params) {
      if (key != "char_type" && params[key] != null) {
        restrictions.push(key + `="${params[key]}"`);
      }
    }
    console.log(restrictions);
    if (restrictions.length != 0) {
      return "where" + restrictions.join(" and ")
    }
    return "";
  }
};

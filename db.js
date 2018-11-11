let sqlite3 = require('sqlite3').verbose();
let db_file_name = 'olympic_history.db';
class DB {
    constructor() {
        this.db = new sqlite3.Database(db_file_name);
    }

    runQuery(query) {
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

    buildRestictionsByParams(params) {
        let restrictions = [];
        for (let key in params) {
            if (key != 'char_type' && params[key] != null) {
                restrictions.push(`${key}="${params[key]}"`);
            }
        }
        if (restrictions.length != 0) {
            return `where ${  restrictions.join(' and ')}`;
        }

        return '';
    }
}

class MedalsStatDB extends DB {
    constructor() {
        super();
    }

    selectStat(params) {
        let sql = `SELECT  year item, count(r.id) count FROM games g LEFT JOIN results r on g.id=r.game_id LEFT JOIN athletes a on a.id=r.athlete_id 
    LEFT JOIN teams t on t.id=a.team_id  ${this.buildRestictionsByParams(params)} GROUP BY year order by year desc;`;
        return this.runQuery(sql);
    }

    selectMaxAmountStat(params) {
        let sql = `SELECT year item, max(count) max_count from(SELECT  year, count(*) count FROM games g LEFT JOIN results r on g.id=r.game_id LEFT JOIN athletes a on a.id=r.athlete_id 
      LEFT JOIN teams t on t.id=a.team_id  ${this.buildRestictionsByParams(params)} 
      GROUP BY year);`;
        return this.runQuery(sql);
    }
}

class TopTeamsStatDB extends DB {
    constructor() {
        super();
    }

    selectStat(params) {
        let sql = `SELECT item, count FROM (SELECT  noc_name item, count(t.id) count FROM games g JOIN results r on g.id=r.game_id JOIN athletes a on a.id=r.athlete_id 
      JOIN teams t on t.id=a.team_id  ${this.buildRestictionsByParams(params)} 
      GROUP BY noc_name order by count desc) where count >= 
      (SELECT avg(count) FROM (SELECT  noc_name, count(t.id) count FROM games g JOIN results r on g.id=r.game_id JOIN athletes a on a.id=r.athlete_id 
      JOIN teams t on t.id=a.team_id  ${this.buildRestictionsByParams(params)} 
      GROUP BY noc_name));`;
        return this.runQuery(sql);
    }

    selectMaxAmountStat(params) {
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

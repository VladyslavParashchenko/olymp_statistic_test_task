let sqlite3 = require("sqlite3").verbose();
let db_file_name = "olympic_history.db";
let db = new sqlite3.Database(db_file_name);

module.exports = {
  saveToDb: function(objectWithData) {
    db.serialize(function() {
      db.run(
        `INSERT INTO sports (name) VALUES ('${objectWithData["sport"]}');`,
        handleDbError
      );
      db.run(
        `INSERT INTO events (name) VALUES ("${objectWithData["event"]}");`,
        handleDbError
      );
      db.run(
        `INSERT INTO games (year, season, city) VALUES ('${
          objectWithData["year"]
        }', 
            '${objectWithData["season"]}','${objectWithData["city"]}');`,
        handleDbError
      );
      db.run(
        `INSERT INTO teams (name, noc_name) VALUES ('${
          objectWithData["team"]
        }', '${objectWithData["noc"]}');`,
        handleDbError
      );
      db.run(
        `INSERT INTO athletes (id, full_name, sex, year_of_birth,  team_id, params) VALUES 
            ('${objectWithData["id"]}', '${objectWithData["name"]}', '${
          objectWithData["sex"]
        }', '${objectWithData["year_of_birth"]}', 
            (select id from teams where name='${
              objectWithData["team"]
            }' and noc_name='${objectWithData["noc"]}'), '${
          objectWithData["params"]
        }');`,
        handleDbError
      );
      db.run(
        `INSERT INTO results (athlete_id, sport_id, event_id, game_id, medal) VALUES 
            (
                (SELECT id from athletes where full_name='${
                  objectWithData["name"]
                }' and year_of_birth='${
          objectWithData["year_of_birth"]
        }' and params='${objectWithData["params"]}' and sex='${
          objectWithData["sex"]
        }'),
                (SELECT id from sports where name="${objectWithData["sport"]}"),
                (SELECT id from events where name="${objectWithData["event"]}"),
                (SELECT id from games where year='${
                  objectWithData["year"]
                }' AND season='${objectWithData["season"]}' and city='${
          objectWithData["city"]
        }'),
                '${objectWithData["medal"]}'
            );`,
        handleDbError
      );
    });
  },
  saveCollectionToDb: function(collection, tableName) {
    let sql = `INSERT INTO ${tableName} (name) VALUES `;
    collection.forEach(function(item) {
      sql+= `("${item.replace("'", "\'")}"), `;
    });
    console.log(sql);
    sql = sql.substring(0, sql.length - 2) + ";";
    db.run(sql);
  },

  saveGamesToDb: function(collection) {
      let sql = 'INSERT INTO ${tableName} (year, season, city) VALUES ';
      collection.forEach(function(item) {
        let data = item.split("-");  
        console.log(data);
        sql+= `('${data[0]}','${data[1]}','${data[2]}')`;
      });  
  }
};

function handleDbError(error) {
  //   console.log(error);
}

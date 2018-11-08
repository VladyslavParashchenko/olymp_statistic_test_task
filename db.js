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
      sql += `("${item.replace("'", "'")}"), `;
    });
    sql = sql.substring(0, sql.length - 2) + ";";
    db.run(sql);
  },

  saveGamesToDb: function(games,callback) {
    let sql = `INSERT INTO games (year, season, city) VALUES `;
    for (let item in games) {
      let data = item.split("-");
      let cities = Array.from(games[item]).join(",");
      if (data[0] != "1906 Summer" && item != "1906-0") {
        sql += `('${data[0]}','${data[1]}',"${cities}"), `;
      }
    }
    sql = sql.substring(0, sql.length - 2) + ";";
    db.run(sql, function(err){
      if(err){

      }else{
        callback();
      }
    });
  },

  saveTeamToDb: function(teams,callback) {
    let sql = `INSERT INTO teams (name, noc_name) VALUES `;
    for (let item in teams) {
      if (item.length >= 3) {
        sql += `("${teams[item]}", "${item}"), `;
      }
    }
    sql = sql.substring(0, sql.length - 2) + ";";
    db.run(sql, function(err){
        if(err){}else{
          callback();
        }
    });
  }, 
  saveUsersToDb: function(users) {
    let i, j, temparray, chunk = 50;
    for (i = 0, j = users.length; i < j; i += chunk) {
      temparray = users.slice(i, i + chunk);
      let sql = `INSERT INTO athletes (full_name, sex, year_of_birth, params, team_id) VALUES `;
      temparray.forEach(function(item) {
        sql += `("${item["name"]}", '${item["sex"]}','${item["year_of_birth"]}',
      '${item["params"]}', (select id from teams where noc_name='${
          item["noc"]
        }')), `;
      });
      sql = sql.substring(0, sql.length - 2) + ";";
      db.run(sql);
    }
  },
  saveResultToDb: function(users) {
    let i, j, temparray, chunk = 50;
    for (i = 0, j = users.length; i < j; i += chunk) {
      temparray = users.slice(i, i + chunk);
      let sql = `INSERT INTO results (athlete_id, game_id, sport_id, event_id, medal) VALUES `;
      temparray.forEach(function(item) {
        sql += `(
          (select id from athletes where full_name="${item["name"]}" and sex="${item["sex"]}" and params='${item["params"]}'), 
         (select id from games where year='${item["year"]}' and season='${item["season"]}'),
        (select id from sports where name="${item["sport"]}"),
        (select id from events where name="${item["event"]}"),
        "${item['medal']}"),`;
      });
      sql = sql.substring(0, sql.length - 1) + ";";
      // console.log(sql);
       db.run(sql);
    }
  }
};

function handleDbError(error) {
  //   console.log(error);
}

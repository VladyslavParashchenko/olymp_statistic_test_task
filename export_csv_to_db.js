const fs = require("fs");
const readline = require("readline");
let sqlite3 = require("sqlite3").verbose();
let db_file_name = "olympic_history.db";
let db = new sqlite3.Database(db_file_name);

let filename = process.argv.slice(2)[0] || "athlete_events.csv";

let rd = readline.createInterface({
  input: fs.createReadStream(filename)
});

let sports = new Set();
let events = new Set();
let games = {};
let teams = {};
let users = [];
let user_list = {};
rd.on("line", function(line) {
  let columns = CSVtoArray(line);
  if (columns != null && columns[0] != "ID") {
    object = makeObject(columns);
    sports.add(object["sport"]);
    events.add(object["event"]);
    teams[object["noc"]] = object["team"];
    users.push(object);
    user_list[object["id"]] = object;
  }
});
rd.on("close", function() {
  saveEventToDb(events);
});

function makeObject(arrWithValues) {
  let keys = [
    "id",
    "name",
    "sex",
    "age",
    "height",
    "weight",
    "team",
    "noc",
    "games",
    "year",
    "season",
    "city",
    "sport",
    "event",
    "medal"
  ];
  let object = {};
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let value =
      arrWithValues[i] == "NA" ? null : arrWithValues[i].replace(/"/g, "");
    if (value != null && ["name", "team"].indexOf(key) != -1) {
      value = correctValue(key, value);
    }
    object[key] = value;
  }
  return handleObject(object);
}

function correctValue(key, value) {
  const regexByKeys = {
    name: /\(.*\)/,
    team: /\-.*/
  };

  return removeSubstringByRegex(regexByKeys[key], value);
}

function removeSubstringByRegex(regularExpression, string) {
  return string.replace(regularExpression, "");
}

function handleObject(object) {
  let age = object["age"];
  object["year_of_birth"] = age == null ? new Date().getFullYear() - age : age;
  object["params"] = JSON.stringify({
    height: object["height"],
    weight: object["weight"]
  });
  object["season"] = object["season"] == "Summer" ? 0 : 1;
  object["medal"] = medalEnumValue(object["medal"]);
  delete object["age"];
  delete object["weight"];
  delete object["height"];
  olympData = handleGame(object);
  return object;
}

function medalEnumValue(value) {
  switch (value) {
    case "Gold":
      return 1;
    case "Silver":
      return 2;
    case "Bronze":
      return 3;
    default:
      return 0;
  }
}

function handleGame(olympData) {
  let key = olympData["year"] + "-" + olympData["season"];
  games[key] = games[key] || new Set();
  games[key].add(olympData["city"]);
  return olympData;
}

function CSVtoArray(text) {
  // var re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
  var re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
  // Return NULL if input string is not well formed CSV string.

  var a = []; // Initialize array to receive values.
  text.replace(
    re_value, // "Walk" the string using replace with callback.
    function(m0, m1, m2, m3) {
      // Remove backslash from \' in single quoted values.
      if (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
      // Remove backslash from \" in double quoted values.
      else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
      else if (m3 !== undefined) a.push(m3);
      return ""; // Return empty string.
    }
  );
  // Handle special case of empty last value.
  if (/,\s*$/.test(text)) a.push("");
  return a;
}
// }

function saveEventToDb(collection) {
  let sql = `INSERT INTO events (name) VALUES `;
  collection.forEach(function(item) {
    sql += `("${item.replace("'", "'")}"), `;
  });
  sql = sql.substring(0, sql.length - 2) + ";";
  db.run(sql, function(err) {
    if (err) {
    } else {
      console.log("save collection");
      saveSportToDb(sports);
    }
  });
}

function saveSportToDb(collection) {
  let sql = `INSERT INTO sports (name) VALUES `;
  collection.forEach(function(item) {
    sql += `("${item.replace("'", "'")}"), `;
  });
  sql = sql.substring(0, sql.length - 2) + ";";
  db.run(sql, function(err) {
    if (err) {
    } else {
      console.log("save sport collection");
      saveGamesToDb(games);
    }
  });
}

function saveGamesToDb(games) {
  let sql = `INSERT INTO games (year, season, city) VALUES `;
  for (let item in games) {
    let data = item.split("-");
    let cities = Array.from(games[item]).join(",");
    if (data[0] != "1906 Summer" && item != "1906-0") {
      sql += `('${data[0]}','${data[1]}',"${cities}"), `;
    }
  }
  sql = sql.substring(0, sql.length - 2) + ";";
  db.run(sql, function(err) {
    if (err) {
    } else {
      console.log("save games");
      saveTeamToDb(teams);
    }
  });
}

function saveTeamToDb(teams) {
  let sql = `INSERT INTO teams (name, noc_name) VALUES `;
  for (let item in teams) {
    if (item.length >= 3) {
      sql += `("${teams[item]}", "${item}"), `;
    }
  }
  sql = sql.substring(0, sql.length - 2) + ";";
  db.run(sql, function(err) {
    if (err) {
    } else {
      console.log("save teams");
      saveUsersToDb(user_list);
    }
  });
}

function saveUsersToDb(user_list) {
  let sql;
  sql = `INSERT INTO athletes (id, full_name, sex, year_of_birth, params, team_id) VALUES `;
  for (let user_id in user_list) {
    let item = user_list[user_id];
    if (
      item["year"] != "1906" &&
      item["season"] != "0" &&
      item["noc"].length >= 3
    ) {
      sql += `(${user_id}, "${item["name"]}", '${item["sex"]}','${
        item["year_of_birth"]
      }',
    '${item["params"]}', (select id from teams where noc_name='${
        item["noc"]
      }')), `;
    }
  }
  sql = sql.substring(0, sql.length - 2) + ";";
  db.run(sql, function(err) {
    if (err) {
      console.log(err.message);
    } else {
      console.log("save user");
      saveResultToDb(users);
    }
  });
}

function saveResultToDb(users) {
  let i, j, temparray, chunk = 50;
  for (i = 0, j = users.length; i < j; i += chunk) {
    temparray = users.slice(i, i + chunk);
    let sql = `INSERT INTO results (athlete_id, game_id, sport_id, event_id, medal) VALUES `;
    temparray.forEach(function(item) {
      if (
        item["year"] != "1906" &&
        item["season"] != "0" &&
        item["noc"].length >= 3
      ) {
        sql += `(${item["id"]}, 
       (select id from games where year='${item["year"]}' and season='${
          item["season"]
        }'),
      (select id from sports where name="${item["sport"]}"),
      (select id from events where name="${item["event"]}"),
      "${item["medal"]}"),`;
      }
    });

    sql = sql.substring(0, sql.length - 1) + ";";
    db.run(sql, function(err) {
    
    });
  }
}

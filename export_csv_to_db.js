const fs = require("fs");
const readline = require("readline");
const db = require("./db.js");
let filename = process.argv.slice(2)[0];

let rd = readline.createInterface({
  input: fs.createReadStream(filename)
});

let sports = new Set();
let events = new Set();
let games = new Set();
let users = [];
rd.on("line", function(line) {
  let columns = line.split(",");
  if (columns[0] != "ID") {
    object = makeObject(columns);
    sports.add(object["sport"]);
    object["sport_id"] = sports.size;
    events.add(object["event"]);
    object["event_id"] = events.size;
    users.push(object);
    game = object["year"] + "-" + object["season"] + "-" + object["city"];
    // console.log(game);
    games.add(game);
    object["game_id"] = games.size;

    // if (object["id"] != "ID") {
    //   db.saveToDb(object);
    // }
  }
});
rd.on("close", function() {
  db.saveCollectionToDb(sports, "sports");
  // db.saveCollectionToDb(events, "events");
  // db.saveGamesToDb(games);
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
    let value = arrWithValues[i] == "NA" ? null : arrWithValues[i].replace(/"/g,"");
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
  object["season"] = object["season"] == "summer" ? 0 : 1;
  delete object["age"];
  delete object["weight"];
  delete object["height"];

  return object;
}

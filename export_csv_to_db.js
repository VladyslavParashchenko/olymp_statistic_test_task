const fs = require("fs");
const readline = require("readline");
const db = require("./db.js");
let filename = process.argv.slice(2)[0];

let rd = readline.createInterface({
  input: fs.createReadStream(filename)
});

let sports = new Set();
let events = new Set();
let games = {};
let teams = {};
let users = [];
rd.on("line", function(line) {
  let columns = CSVtoArray(line);
  if (columns != null && columns[0] != "ID") {
    object = makeObject(columns);
    sports.add(object["sport"]);
    events.add(object["event"]);
    teams[object["noc"]] = object["team"];
    users.push(object);
  }
});
rd.on("close", function() {
  db.saveCollectionToDb(sports, "sports");
  db.saveCollectionToDb(events, "events");
  db.saveGamesToDb(games, db.saveTeamToDb(teams,db.saveUsersToDb(users)));

  // db.saveResultToDb(users);
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

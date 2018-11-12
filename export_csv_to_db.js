const fs = require('fs');
const readline = require('readline');
const sqlite3 = require('sqlite3').verbose();
let dbFileName = 'olympic_history.db';
let db = new sqlite3.Database(dbFileName, (err) => {
  if (err) {
    console.error(err.message);
  }
  let tableNames = ['sports', 'events', 'games', 'teams', 'athletes', 'results'];
  console.log('clear tables');
  Promise.all(tableNames.map((tableName) => {
    return runQuery(`DELETE FROM ${tableName};`);
  }))
    .then(() => {
      console.log('reset sequences in database');
      Promise.all(tableNames.map((tableName) => {
        return runQuery(`DELETE FROM sqlite_sequence WHERE name="${tableName}";`);
      })).then(() => {
        startImport();
      });
    })
    .catch(e => console.log(e));
});
let filename = process.argv.slice(2)[0] || 'athlete_events.csv';

function startImport () {
  let rd = readline.createInterface({
    input: fs.createReadStream(filename)
  });
  rd.on('line', function (line) {
    let columns = CSVtoArray(line);
    if (columns != null && columns[0] !== 'ID') {
      object = makeObject(columns);
      if (object['year'] === '1906' && object['season'] === '0') {
        return;
      }
      sports.add(object['sport']);
      events.add(object['event']);
      teams[object['noc']] = object['team'];
      users.push(object);
      userList[object['id']] = object;
    }
  });
  rd.on('close', function () {
    const promises = [saveCollectionToDb('events', events), saveCollectionToDb('sports', sports), saveGamesToDb(games), saveTeamToDb(teams), saveUsersToDb(userList)];
    Promise.all(promises)
      .then(data => {
        console.log('all record saved');
      })
      .catch(e => console.log(e));
  });
}

let sports = new Set();
let events = new Set();
let games = {};
let teams = {};
let users = [];
let userList = {};
let object;

function makeObject (arrWithValues) {
  let keys = [
    'id',
    'name',
    'sex',
    'age',
    'height',
    'weight',
    'team',
    'noc',
    'games',
    'year',
    'season',
    'city',
    'sport',
    'event',
    'medal'
  ];
  let object = {};
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let value = arrWithValues[i] === 'NA' ? null : arrWithValues[i];
    if (value != null && ['name', 'team'].indexOf(key) !== -1) {
      value = correctValue(key, value);
    }
    object[key] = value;
  }
  return handleObject(object);
}

function correctValue (key, value) {
  const regexByKeys = {
    name: /\(.*\)/,
    team: /-.*/
  };

  return removeSubstringByRegex(regexByKeys[key], value);
}

function removeSubstringByRegex (regularExpression, string) {
  return string.replace(regularExpression, '');
}

function handleObject (object) {
  let age = object['age'];
  object['year_of_birth'] = age !== null ? new Date().getFullYear() - age : null;
  object['params'] = JSON.stringify({
    height: object['height'],
    weight: object['weight']
  });
  object['season'] = object['season'] === 'Summer' ? 0 : 1;
  object['medal'] = medalEnumValue(object['medal']);
  delete object['age'];
  delete object['weight'];
  delete object['height'];
  object = handleGame(object);
  return object;
}

function medalEnumValue (value) {
  switch (value) {
    case 'Gold':
      return 1;
    case 'Silver':
      return 2;
    case 'Bronze':
      return 3;
    default:
      return 0;
  }
}

function handleGame (olympData) {
  let key = olympData['year'] + '-' + olympData['season'];
  games[key] = games[key] || new Set();
  games[key].add(olympData['city']);
  return olympData;
}

function CSVtoArray (line) {
  // eslint-disable-next-line
  let fields = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/g);
  // remove extra brackets
  fields = fields.map((str) => {
    if ((str.charAt(0) === '"') && (str.charAt(str.length - 1))) {
      return str.substr(1, str.length - 2);
    } else {
      return str;
    }
  }
  );
  return fields;
}

function saveCollectionToDb (tableName, collection) {
  let values = Array.from(collection).map(function (item) {
    return `("${item}")`;
  }).join(', ');
  let sql = `INSERT INTO ${tableName} (name) VALUES ${values}`;
  console.log(`${tableName} are saving`);
  return runQuery(sql);
}

function saveGamesToDb (games) {
  let gamesArr = [];
  for (let item in games) {
    let data = item.split('-');
    let cities = Array.from(games[item]).join(',');
    if (item !== '1906-0') {
      gamesArr.push(`('${data[0]}','${data[1]}',"${cities}")`);
    }
  }
  let sql = `INSERT INTO games (year, season, city) VALUES ${gamesArr.join(', ')}`;
  console.log(`games are saving`);
  return runQuery(sql);
}

function saveTeamToDb (teams) {
  let teamsArr = [];
  for (let item in teams) {
    teamsArr.push(`("${teams[item]}", "${item}") `);
  }
  let sql = `INSERT INTO teams (name, noc_name) VALUES ${teamsArr.join(', ')}`;
  console.log(`teams are saving`);
  return runQuery(sql);
}

function saveUsersToDb (userList) {
  let userArr = [];
  for (let userId in userList) {
    let item = userList[userId];
    if (
      item['year'] !== '1906' &&
      item['season'] !== '0' &&
      item['noc'].length >= 3
    ) {
      userArr.push(`(${userId}, "${item['name']}", '${item['sex']}','${item['year_of_birth']}',
      '${item['params']}', (select id from teams where noc_name='${item['noc']}'))`);
    }
  }
  let sql = `INSERT INTO athletes (id, full_name, sex, year_of_birth, params, team_id) VALUES ${userArr.join(', ')}`;
  return runQuery(sql);
}

function saveResultToDb (users) {
  let i;
  let j;
  let temparray;
  let chunk = 50;
  for (i = 0, j = users.length; i < j; i += chunk) {
    temparray = users.slice(i, i + chunk);
    let sql = `INSERT INTO results (athlete_id, game_id, sport_id, event_id, medal) VALUES `;
    temparray.forEach(function (item) {
      if (item['year'] !== '1906') {
        sql += `(${item['id']}, 
       (select id from games where year='${item['year']}' and season='${
  item['season']
}'),
      (select id from sports where name="${item['sport']}"),
      (select id from events where name="${item['event']}"),
      "${item['medal']}"),`;
      }
    });

    sql = sql.substring(0, sql.length - 1) + ';';
    db.run(sql);
  }
}

function runQuery (query) {
  return new Promise((resolve, reject) => {
    db.run(query, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

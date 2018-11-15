const fs = require('fs');
const readline = require('readline');
const sqlite3 = require('sqlite3').verbose();
let dbFileName = 'olympic_history.db';

let filename = process.argv.slice(2)[0] || 'athlete_events.csv';

process.on('SIGINT', closeDbConnection);
process.on('SIGTERM', closeDbConnection);

let sports = new Set();
let events = new Set();
let games = {};
let teams = {};
let users = [];
let userList = {};
let object;

let db = new sqlite3.Database(dbFileName, (err) => {
  if (err) {
    console.error(err.message);
  } else {
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
      .catch(e => console.log(e.message));
  }
});

function startImport () {
  console.time('import_timer');
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
    const promises = [
      saveCollectionToDb('events', events),
      saveCollectionToDb('sports', sports),
      saveGamesToDb(games),
      saveTeamToDb(teams)
    ];
    Promise.all(promises)
      .then(data => {
        saveUsersToDb(userList);
      })
      .catch(e => console.log(e.message));
  });
}

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
    name: /\(([^)]+)\)/g,
    team: /-.*/
  };

  return removeSubstringByRegex(regexByKeys[key], value);
}

function removeSubstringByRegex (regularExpression, string) {
  return string.replace(regularExpression, '').trim();
}

function handleObject (object) {
  let age = object['age'];
  let year = object['year'];
  object['year_of_birth'] = (age !== null && year !== null) ? year - age : null;
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
  let id = 1;
  for (let item in games) {
    let data = item.split('-');
    let cities = Array.from(games[item]).join(',');
    if (item !== '1906-0') {
      gamesArr.push(`(${id},'${data[0]}','${data[1]}',"${cities}")`);
    }
    games[item]['id'] = id;
    id++;
  }
  let sql = `INSERT INTO games (id, year, season, city) VALUES ${gamesArr.join(', ')}`;
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
  let sqlQueries = ['BEGIN TRANSACTION'];
  for (let userId in userList) {
    let item = userList[userId];
    sqlQueries.push(`INSERT INTO athletes (id, full_name, sex, year_of_birth, params, team_id) VALUES (${userId}, "${item['name']}", '${item['sex']}','${item['year_of_birth']}',
      '${item['params']}', (select id from teams where noc_name='${item['noc']}'))`);
  }
  return Promise.all(sqlQueries.map((query) => {
    return runQuery(query);
  }))
    .then(() => {
      return runQuery('COMMIT;');
    }).then(() => {
      console.log('users saved');
      sports = Array.from(sports);
      events = Array.from(events);
      saveResultToDb(users);
    })
    .catch(e => {
      console.log(e);
      runQuery('ROLLBACK;');
    });
}

function saveResultToDb (users) {
  let sqlQueries = ['BEGIN TRANSACTION'];
  for (let userId in users) {
    let item = users[userId];
    sqlQueries.push(`INSERT INTO results (athlete_id, game_id, sport_id, event_id, medal) VALUES (${users[userId]['id']}, 
       ${findGame(item['year'] + '-' + item['season'])},${sports.indexOf(item['sport'])},
      ${events.indexOf(item['event'])},${item['medal']})`);
  }
  return Promise.all(sqlQueries.map((sqlQueries) => {
    return runQuery(sqlQueries);
  })).then(() => {
    return runQuery('COMMIT;');
  }).then(() => {
    console.log('save complete');
    console.timeEnd('import_timer');
    closeDbConnection();
  })
    .catch(e => {
      console.log(e);
      runQuery('ROLLBACK;');
    });
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

function closeDbConnection () {
  db.close((err) => {
    if (err) {
      return console.error(err.message);
    } else {
      console.log('Close the database connection.');
      process.exit();
    }
  });
}

function findGame (game) {
  for (let gameKey in games) {
    if (gameKey === game) {
      return games[gameKey]['id'];
    }
  }
}

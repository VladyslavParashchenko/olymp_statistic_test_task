var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');
 

let sqlite3 = require('sqlite3').verbose();
let db_file_name = 'olympic_history.db';
let db = new sqlite3.Database(db_file_name);

module.exports = {
    saveUser: function(user) {
        
        db.run(`INSERT INTO langs(name) VALUES(?)`, ['C'], function(err) {
            if (err) {
              return console.log(err.message);
            }
            // get the last insert id
            console.log(`A row has been inserted with rowid ${this.lastID}`);
          });
    },
};
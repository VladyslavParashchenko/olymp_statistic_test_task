const fs = require('fs');
const readline = require('readline');

let filename = process.argv.slice(2)[0];
console.log(process.argv.slice(2));

let rd = readline.createInterface({
    input: fs.createReadStream(filename),
    output: process.stdout
});
rd.on('error', function(error){
    console.log(error.message);
})
rd.on('line', function(line) {
    console.log(line);
});
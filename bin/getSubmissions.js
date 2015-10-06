#!/usr/bin/env node

var getSubmissions = require('../index.js');
var inf = 10000000;
var handle;
var count = inf;
var directory = '.'


process.argv.forEach(function (v, i, arr) {
  if (v == '-h') handle = arr[i + 1];
  if (v == '-c') {
    var val = arr[i + 1];
    if (!isNaN(val) && val > 0) count = val;
  }
  if (v == '-d') {
    var val = arr[i + 1];
    if (val) directory = val;
    var s = directory.length - 1;
    if (directory[s] == '/') directory = directory.substr(0,s);
  }
});

if (!handle) {
  var pname = process.argv[1].split('/');
  pname = pname[pname.length - 1];
  console.log('\nUsage: ' + process.argv[0] + ' ' + pname + ' <handle> <count>\n');
  console.log('<handle>: Valid handle from codeforces.com');
  console.log('<count>: Searching for Accepted in the last N submissions, "infinite" by default\n');
  process.exit(1);
}


if (directory != '.') {
  mkdirp(directory, function (err) {
    if (err) console.error(err)
  });
}


getSubmissions(handle, count, directory);

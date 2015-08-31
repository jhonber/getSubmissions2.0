var request = require('request');
var cheerio = require('cheerio');
var fs      = require('fs');
var mkdirp  = require('mkdirp');
var async   = require('async');


var inf = 1000000;
var handle = process.argv[2];
var count  = process.argv[3] || inf;
var dbPath = './data.db';
var db = {};
var subIds = [];
var directory = './codes';
var url = 'http://codeforces.com/api/user.status?handle=' + handle + '&from=1&count=' + count;
var extension = {'GNU C++': 'cpp', 'GNU C': 'c' ,'Java': 'java', 'Haskell': 'hs',
  'Pascal':'p', 'Perl': 'pl', 'PHP': 'php', 'Python': 'py', 'Ruby': 'rb', 'JavaScript': 'js'};

var comment = {'GNU C++': '//','GNU C': '//' ,'Java': '//', 'Haskell': '--',
  'Pascal': '//', 'Perl': '#', 'PHP': '//', 'Python': '#', 'Ruby': '#', 'JavaScript': '//'};




if (!handle) {
  console.log('\nUsage: node index.js <handle> <count>\n');
  console.log('<handle>: Validad handle from codeforces.com');
  console.log('<count>: Searching for Accepted in the last N submissions, "infinite" by default\n');
  process.exit(1);
}


if (!fs.existsSync(dbPath)) {
  fs.writeFile(dbPath, '', function (err) {
    if (err) throw err;
    else {
      console.log('Created DataBase!', dbPath);
    }
  });
}
else loadDB();


if (!fs.existsSync(directory)) {
  mkdirp(directory, function (err) {
    if (err) console.error(err)
  });
}

request.get(url, function (err, res, body) {
  if (err) console.log(err);
  else {
    var data = JSON.parse(body);
    if (data.status == 'OK') {
      var result = data.result;
      for (var i = 0; i < result.length; ++i) {
        var res = result[i];
        var contestId = res.contestId;
        var index = res.problem.index;
        var lang = res.programmingLanguage;
        var urlProblemStat = 'http://codeforces.com/contest/' + contestId + '/problem/' + index;
        var ext = getExtension(lang);

        if (res.verdict == 'OK') {
          subIds.push( {subId: res.id, contestId: contestId, index: index,
                      lang: lang, urlProblemStat: urlProblemStat, ext: ext} );
        }
      }

      async.each(subIds, function (item, callback) {
        var subId = item.subId;
        var contestId = item.contestId;
        var problemName = item.index;
        var urlProblemStat = item.urlProblemStat;
        var lang = item.lang;
        var ext = item.ext;

        if (db[subId]) {
          console.log('Already downloaded: ', subId);
        }
        else {
          getSourceCode(subId, contestId, function(err, sourceCode) {
            if (err) console.log(err);
            else {
              getContestName(contestId, function (err, contestName) {
                if (err) console.log(err);
                else {
                  sourceCode = sourceCode.replace(/(\r\n|\n|\r)/gm, '\n');
                  var comm = getComment(lang);
                  if (comm) sourceCode = comm + ' ' + urlProblemStat + '\n\n' + sourceCode;

                  var name;
                  if (ext) name = problemName + '.' + ext;
                  else name = problemName;

                  var contestDir = directory + '/' + contestName;
                  var path = contestDir + '/' + name;

                  if (!fs.existsSync(contestDir)) {
                    mkdirp(contestDir, function (err) {
                      if (err) console.error(err)
                        else {
                          fs.writeFile(path, sourceCode, function (err) {
                            if (err) throw err;
                            else {
                              saveInDB(subId);
                            }
                          });
                        }
                    });
                  }
                  else {
                    fs.writeFile(path, sourceCode, function (err) {
                      if (err) throw err;
                      else {
                        saveInDB(subId);
                      }
                    });
                  }
                }
              });
            }
          });
        }
      });
    }
  }
});


function getSourceCode (subId, contestId, callback) {
  var url = 'http://codeforces.com/contest/'+ contestId + '/submission/' + subId;
  request.get(url, function (err, res, body) {
    var $ = cheerio.load(body);
    var sourceCode = $('.program-source')[0].children[0].data;
    callback(null, sourceCode);
  });
}

function getContestName (contestId, callback) {
  var url = 'http://codeforces.com/api/contest.standings?contestId=' + contestId + '&from=1&count=1'
  request.get(url, function (err, res, body) {
    var data = body = JSON.parse(body);
    if (data.status == 'OK') {
      var name = data.result.contest.name;
      callback(false, name);
    }
    else callback(true);
  });
}

function getExtension (lang) {
  for (var key in extension) {
    if (extension.hasOwnProperty(key) && typeof lang.indexOf &&
        lang.indexOf(key) != -1) {
      return extension[key];
    }
  }
}

function getComment (lang) {
  for (var key in comment) {
    if (comment.hasOwnProperty(key) && typeof lang.indexOf &&
        lang.indexOf(key) != -1) {
      return comment[key];
    }
  }
}

function loadDB () {
  var data = fs.readFileSync(dbPath);
  var d = data.toString().split('\n');
  for (var i = 0; i < d.length; ++i) {
    var n = Number(d[i]);
    if (!isNaN(d[i])) db[n] = true;
  }
  console.log('Loaded data base!');
}

function saveInDB (sub) {
  fs.appendFile(dbPath, '\n' + sub, function (err) {
    if (err) throw err;
  });
}

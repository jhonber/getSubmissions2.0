var request = require('request');
var cheerio = require('cheerio');
var fs      = require('fs');
var mkdirp  = require('mkdirp');
var progBar = require('progress');
var async = require('async');


var inf = 10000000;
var maxContestId = 100000;
var cnt = 0;
var handle;
var count;
var contestMap = {};
var dbPath = './data.db';
var directory = '.';
var url2 = 'http://codeforces.com/api/contest.list';
var extension = {'GNU C++': 'cpp', 'GNU C': 'c' ,'Java': 'java', 'Haskell': 'hs',
  'Pascal':'p', 'Perl': 'pl', 'PHP': 'php', 'Python': 'py', 'Ruby': 'rb', 'JavaScript': 'js'};

var comment = {'GNU C++': '//','GNU C': '//' ,'Java': '//', 'Haskell': '--',
  'Pascal': '//', 'Perl': '#', 'PHP': '//', 'Python': '#', 'Ruby': '#', 'JavaScript': '//'};




process.argv.forEach(function (v, i, arr) {
  if (v == '-h') handle = arr[i + 1];
  if (v == '-c') {
    var val = arr[i + 1];
    count = val;
    if (isNaN(val)) count = inf;
    else if (Number(val) <= 0) count = inf;
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


setTimeout(function() {console.log('Downloading contest names ...')}, 1000);

request.get(url2, function (err, res, body) {
  var data = body = JSON.parse(body);
  if (data.status == 'OK') {
    processContestNames (data.result, function (err) {
      if (!err) {
        var url = 'http://codeforces.com/api/user.status?handle=' + handle + '&from=1&count=' + count;
        console.log(handle)
        console.log(count)
        console.log(directory)

        console.log('Downloading submissions ids ...');
        request.get(url, function (err, res, body) {
          if (err) console.log('Error to get ' + url, err);
          else {
            var data = JSON.parse(body);
            if (data.status == 'OK') {
              var data = data.result;

              loadDB(function (err, db) {
                if (err) console.log(err);

                console.log('Downloading source codes ...');
                async.each(data, function (cur, callback) {
                  if (cur.verdict == 'OK') {
                    var contestId = cur.contestId;
                    var index = cur.problem.index;
                    var lang = cur.programmingLanguage;
                    var urlProblemStat = 'http://codeforces.com/contest/' + contestId + '/problem/' + index;
                    var ext = getExtension(lang);
                    var isGym = false;

                    if (contestId > maxContestId) {
                      urlProblemStat = 'http://codeforces.com/gym/' + contestId + '/problem/' + index;
                      isGym = true;
                    }

                    if (!db[cur.id]) {
                      var sub = { subId: cur.id, contestId: contestId, index: index,
                        lang: lang, urlProblemStat: urlProblemStat, ext: ext, isGym: isGym }

                        process.nextTick(function(){ getSourceCode(sub) });
                    }
                  }
                });
              });
          }
          else {
              console.log('API error ' + url, data.status);
            }
          }

        });
      }
    });
  }
  else {
    console.log('API Error ' + url, data.status);
  }

});


function processContestNames (data, callback) {
  function go (i) {
    if (i >= data.length) {
      callback(null);
    }
    else {
      var name = data[i].name;
      var id = data[i].id;
      contestMap[id] = name;
      go (i + 1);
    }
  }
  go (0);
}


function getSourceCode (sub) {
  if (!sub.isGym) {
    var contestId = sub.contestId;
    var subId = sub.subId;
    var url = 'http://codeforces.com/contest/' + contestId + '/submission/' + subId;

    request.get(url, function (err, res, body) {
      try {
        var $ = cheerio.load(body);
        var sourceCode = $('.program-source')[0].children[0].data;
        writeFile(sub, sourceCode);
      }
      catch (err) {
        console.log('This submission required authentication to download:');
        console.log(url + '\n');
      }
    });
  }
  else {
    console.log('This submission belongs to gym contest:');
    console.log(sub.urlProblemStat + '\n');
  }
}


function writeFile (sub, sourceCode) {
  sourceCode = sourceCode.replace(/(\r\n|\n|\r)/gm, '\n');
  var comm = getComment(sub.lang);
  if (comm) sourceCode = comm + ' ' + sub.urlProblemStat + '\n\n' + sourceCode;

  var name;
  if (sub.ext) name = sub.index + '.' + sub.ext;
  else name = sub.index;

  var contestDir = directory + '/' + contestMap[sub.contestId];
  var path = contestDir + '/' + name;

  if (!fs.existsSync(contestDir)) {
    mkdirp(contestDir, function (err) {
      if (err) console.error(err)
        else {
          fs.writeFile(path, sourceCode, function (err) {
            if (err) throw err;
            else {
              saveInDB(sub.subId);
            }
          });
        }
    });
  }
  else {
    fs.writeFile(path, sourceCode, function (err) {
      if (err) throw err;
      else {
        saveInDB(sub.subId);
      }
    });
  }
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


function loadDB (callback) {
  var db = {};
  if (!fs.existsSync(dbPath)) {
    fs.writeFile(dbPath, '', function (err) {
      if (err) throw err;
      else {
        console.log('Created data base!', dbPath);
        callback(null, db);
      }
    });
  }
  else {
    var data = fs.readFileSync(dbPath);
    var d = data.toString().split('\n');

    function go (i) {
      if (i >= data.length) {
        console.log('Loaded data base!');
        callback(null, db);
      }
      else {
        var n = Number(d[i]);
        if (!isNaN(n)) db[n] = true;
        go (i + 1);
      }
    }
    go (0);
  }
}


function saveInDB (sub) {
  fs.appendFile(dbPath, '\n' + sub, function (err) {
    if (err) throw err;
  });
}


function afterComplete (cnt, tot) {
  console.log('Downloaded ', cnt, 'of', tot, 'submissions');
}

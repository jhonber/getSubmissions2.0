var request = require('request');
var cheerio = require('cheerio');
var fs      = require('fs');
var mkdirp  = require('mkdirp');
var progBar = require('progress');


var inf = 1000000;
var maxContestId = 100000;
var cnt = 0;
var handle = process.argv[2];
var count  = process.argv[3] || inf;
var failed = [];
var accepted = [];
var contestMap = {};
var dbPath = './data.db';
var db = {};
var directory = './codes';
var url = 'http://codeforces.com/api/user.status?handle=' + handle + '&from=1&count=' + count;
var url2 = 'http://codeforces.com/api/contest.list';
var extension = {'GNU C++': 'cpp', 'GNU C': 'c' ,'Java': 'java', 'Haskell': 'hs',
  'Pascal':'p', 'Perl': 'pl', 'PHP': 'php', 'Python': 'py', 'Ruby': 'rb', 'JavaScript': 'js'};

var comment = {'GNU C++': '//','GNU C': '//' ,'Java': '//', 'Haskell': '--',
  'Pascal': '//', 'Perl': '#', 'PHP': '//', 'Python': '#', 'Ruby': '#', 'JavaScript': '//'};




if (!handle) {
  var pname = process.argv[1].split('/');
  pname = pname[pname.length - 1];
  console.log('\nUsage: ' + process.argv[0] + ' ' + pname + ' <handle> <count>\n');
  console.log('<handle>: Valid handle from codeforces.com');
  console.log('<count>: Searching for Accepted in the last N submissions, "infinite" by default\n');
  process.exit(1);
}


if (!fs.existsSync(dbPath)) {
  fs.writeFile(dbPath, '', function (err) {
    if (err) throw err;
    else {
      console.log('Created data base!', dbPath);
    }
  });
}
else loadDB();


if (!fs.existsSync(directory)) {
  mkdirp(directory, function (err) {
    if (err) console.error(err)
  });
}


setTimeout(function() {console.log('Waiting for response of Codeforces ...')}, 1000);

request.get(url, function (err, res, body) {
  if (err) console.log('Error to get ' + url, err);
  else {
    var data = JSON.parse(body);
    if (data.status == 'OK') {
      var data = data.result;

      for (var i = 0; i < data.length; ++i) {
        var cur = data[i];
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

          if (!db[res.id]) {
            accepted.push( {subId: cur.id, contestId: contestId, index: index,
                        lang: lang, urlProblemStat: urlProblemStat, ext: ext, isGym: isGym} );
          }
        }
      }
    }
    else {
      console.log('API error ' + url, data.status);
    }
  }
});

request.get(url2, function (err, res, body) {
  var data = body = JSON.parse(body);
  if (data.status == 'OK') {
    for (var i = 0; i < data.length; ++i) {
      var name = data[i].result.contest.name;
      var id = data[i].result.contest.id;
      contestMap[id] = name;
    }
  }
  else {
    console.log('API Error ' + url, data.status);
  }
});


function getSourceCode () {
  for (var i = 0; i < accepted.length; ++i) {
    if (accepted[i].isGym) continue;
    var contestId = accepted[i].contestId;
    var subId = accepted[i].subId;
    var url = 'http://codeforces.com/contest/' + contestId + '/submission/' + subId;
    request.get(url, function (err, res, body) {
      try {
        var $ = cheerio.load(body);
        var sourceCode = $('.program-source')[0].children[0].data;
        writeFile(accepted[i], sourceCode)
      }
      catch (err) {
        console.log('Error on getSource: ', err);
      }
    });
  }
}

process.nextTick(function () {
  getSourceCode();
});


function writeFile (sub, sourceCode) {
  sourceCode = sourceCode.replace(/(\r\n|\n|\r)/gm, '\n');
  var comm = getComment(sub.lang);
  if (comm) sourceCode = comm + ' ' + sub.urlProblemStat + '\n\n' + sourceCode;

  var name;
  if (ext) name = sub.index + '.' + sub.ext;
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

function afterComplete (cnt, tot) {
  console.log('Downloaded ', cnt, 'of', tot, 'submissions');
  if (cnt < tot) {
    console.log('\nFailed to download ' + failed.length + ' submissions.\n');
    console.log('Maybe they belong to Gym contest or authentication is required.\n');

    for (var i = 0; i < failed.length; ++i) console.log(failed[i]);
  }
}

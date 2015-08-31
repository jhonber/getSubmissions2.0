var request = require('request');
var cheerio = require('cheerio');
var fs      = require('fs');
var mkdirp  = require('mkdirp');
var async   = require('async');
var progBar = require('progress');


var inf = 1000000;
var maxContestId = 100000;
var cnt = 0;
var handle = process.argv[2];
var count  = process.argv[3] || inf;
var failed = [];
var dbPath = './data.db';
var db = {};
var directory = './codes';
var url = 'http://codeforces.com/api/user.status?handle=' + handle + '&from=1&count=' + count;
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
      var result = data.result;

      getLastSubIds(result, function (err, subIds) {
        var tot = subIds.length;

        if (tot == 0) {
          console.log('No new submissions!')
          process.exit(0);
        }

        console.log('Total submissions to download: ', tot);
        var bar = new progBar('  downloading [:bar] :percent :etas', {
          complete: '#',
          incomplete: '.',
          width: 20,
          total: tot
        });

        async.each(subIds, function (item, callback) {
          var subId = item.subId;
          var contestId = item.contestId;
          var problemName = item.index;
          var urlProblemStat = item.urlProblemStat;
          var lang = item.lang;
          var ext = item.ext;
          var isGym = item.isGym;


          if (!isGym) {
            getSourceCode(subId, contestId, function(err, sourceCode) {
              if (err) {
                bar.tick();
                failed.push(urlProblemStat);
                if (bar.complete) afterComplete(cnt, tot);
              }
              else {
                getContestName(contestId, function (err, contestName) {
                  if (err) console.log('Error on getContestName: ' + err);
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
                                cnt ++;
                                saveInDB(subId);
                                bar.tick();
                                if (bar.complete) afterComplete(cnt, tot);
                              }
                            });
                          }
                      });
                    }
                    else {
                      fs.writeFile(path, sourceCode, function (err) {
                        if (err) throw err;
                        else {
                          cnt ++;
                          saveInDB(subId);
                          bar.tick();
                          if (bar.complete) afterComplete(cnt, tot);
                        }
                      });
                    }
                  }
                });
              }
            });
          }
          else {
            bar.tick();
            failed.push(urlProblemStat);
            if (bar.complete) afterComplete(cnt, tot);
          }
        });
      });
    }
  }
});

function getLastSubIds (data, callback) {
  var subIds = [];
  console.log('Searching for Accepted codes ...');

  async.each(data, function (item, callback) {
    var res = item;
    var contestId = res.contestId;
    var index = res.problem.index;
    var lang = res.programmingLanguage;
    var urlProblemStat = 'http://codeforces.com/contest/' + contestId + '/problem/' + index;
    var ext = getExtension(lang);
    var isGym = false;

    if (contestId > maxContestId) {
      urlProblemStat = 'http://codeforces.com/gym/' + contestId + '/problem/' + index;
      isGym = true;
    }

    if (res.verdict == 'OK') {
      if (!db[res.id]) {
        subIds.push( {subId: res.id, contestId: contestId, index: index,
                    lang: lang, urlProblemStat: urlProblemStat, ext: ext, isGym: isGym} );
      }
    }
  });

  callback(null, subIds);
}

function getSourceCode (subId, contestId, callback) {
  var url = 'http://codeforces.com/contest/' + contestId + '/submission/' + subId;
  request.get(url, function (err, res, body) {
    try {
      var $ = cheerio.load(body);
      var sourceCode = $('.program-source')[0].children[0].data;
      callback(null, sourceCode);
    }
    catch (err) {
      callback(err);
    }
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
    else callback(err);
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

function afterComplete (cnt, tot) {
  console.log('Downloaded ', cnt, 'of', tot, 'submissions');
  if (cnt < tot) {
    console.log('\nFailed to download ' + failed.length + ' submissions.\n');
    console.log('Maybe they belong to Gym contest or authentication is required.\n');

    for (var i = 0; i < failed.length; ++i) console.log(failed[i]);
  }
}

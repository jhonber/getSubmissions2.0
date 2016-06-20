var request = require('request');
var cheerio = require('cheerio');
var fs      = require('fs');
var mkdirp  = require('mkdirp');
var async   = require('async');
var progBar = require('progress');

var maxContestId = 100000;
var cnt = total = 0;
var failed = [];
var contestMap = {};
var dbPath = './data.db';
var url2 = 'http://codeforces.com/api/contest.list';
var extension = {'GNU C++': 'cpp', 'GNU C': 'c' ,'Java': 'java', 'Haskell': 'hs',
  'Pascal':'p', 'Perl': 'pl', 'PHP': 'php', 'Python': 'py', 'Ruby': 'rb', 'JavaScript': 'js',
  'Ada': 'adb':, 'Kotlin': 'kt'};

var comment = {'GNU C++': '//','GNU C': '//' ,'Java': '//', 'Haskell': '--',
  'Pascal': '//', 'Perl': '#', 'PHP': '//', 'Python': '#', 'Ruby': '#', 'JavaScript': '//',
  'Ada': '--', 'Kotlin': '//'};




function getSubmissions(handle, count, directory) {
  request.get(url2, function (err, res, body) {
    var data = body = JSON.parse(body);
    if (data.status == 'OK') {
      processContestNames (data.result, function (err) {
        if (!err) {
          var url = 'http://codeforces.com/api/user.status?handle=' + handle + '&from=1&count=' + count;

          console.log('Downloading submissions ids ...');
          request.get(url, function (err, res, body) {
            if (err) console.log('Error to get ' + url, err);
            else {
              var data = JSON.parse(body);
              if (data.status == 'OK') {
                var data = data.result;

                loadDB(function (err, db) {

                  selectSubToDownload (db, data, function (err, res) {
                    var tot = res.length;
                    total = tot;
                    var bar = new progBar('  downloading [:bar] :percent :etas', {
                      complete: '#',
                      incomplete: '.',
                      width: 20,
                      total: tot
                    });

                    console.log('Total accepted: ', tot);
                    if (err) console.log(err);

                    console.log('Downloading source codes ...');
                    async.each(res, function (cur, callback) {
                      getSourceCode(cur, directory, function (err) {
                        cnt ++;
                        bar.tick();
                        if (bar.complete) afterComplete();
                        callback();
                      });
                    });
                  });
                });
              }
              else console.log('API error ' + url, data.status);
            }

          });
        }
      });
    }
    else {
      console.log('API Error ' + url, data.status);
    }

  });
}


function selectSubToDownload (db, data, callback) {
  var res = [];
  function go (i) {
    if (i >= data.length) {
      callback(null, res);
    }
    else {
      var cur = data[i];
      if (cur.verdict == 'OK' && !db[cur.id]) {
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

        var sub = { subId: cur.id, contestId: contestId, index: index,
                      lang: lang, urlProblemStat: urlProblemStat, ext: ext, isGym: isGym }
        res.push(sub);
      }
      go (i + 1);
    }
  }
  go (0);
}


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


function getSourceCode (sub, directory, callback) {
  if (!sub.isGym) {
    var contestId = sub.contestId;
    var subId = sub.subId;
    var url = 'http://codeforces.com/contest/' + contestId + '/submission/' + subId;

    request.get(url, function (err, res, body) {
      try {
        var $ = cheerio.load(body);
        var sourceCode = $('.program-source')[0].children[0].data;
        writeFile(sub, sourceCode, directory, function (err) {
          callback(null);
        });
      }
      catch (err) {
        var s = 'This submission required authentication to download:\n' + url + '\n';
        failed.push(s);
        callback(true);
      }
    });
  }
  else {
    var s = 'This submission belongs to gym contest:\n' + sub.urlProblemStat + '\n';
    failed.push(s);
    cnt --;
    callback(null);
  }
}


function writeFile (sub, sourceCode, directory, callback) {
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
              callback(null);
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
        callback(null);
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
      if (i >= d.length) {
        console.log('Loaded data base!');
        callback(null, db);
      }
      else {
        var n = Number(d[i]);
        if (!isNaN(n) && n > 0) db[n] = true;
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

function afterComplete () {
  for (var i = 0; i < failed.length; ++i) console.log(failed[i]);
  console.log('\nDownloaded ', cnt, 'of', total, 'submissions');
}


module.exports = function(handle, count, directory) {
  if (directory != '.') {
    mkdirp(dir, function (err) {
      if (err) console.error(err)
    });
  }

  getSubmissions(handle, count, directory);
}

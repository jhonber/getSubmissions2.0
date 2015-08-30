var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var mkdirp = require('mkdirp');

var handle = process.argv[2];
var subIds = [];
var url = 'http://codeforces.com/api/user.status?handle=' + handle + '&from=1&count=1';
var ext = {'GNU C++': 'cpp', 'GNU C++11': 'cpp', 'GNU C': 'c' ,'Java': 'java', 'Haskell': 'hs',
  'Pascal':'p', 'Perl': 'pl', 'PHP': 'php', 'Python': 'py', 'Ruby': 'rb', 'JavaScript': 'js'};
var comment = {'GNU C++': '//', 'GNU C++11': '//', 'GNU C': '//' ,'Java': '//', 'Haskell': '--',
  'Pascal': '//', 'Perl': '#', 'PHP': '//', 'Python': '#', 'Ruby': '#', 'JavaScript': '//'};


request.get(url, function (err, res, body) {
  if (err) console.log(err);
  else if (handle) {
    var data = JSON.parse(body);
    if (data.status == 'OK') {
      var result = data.result;
      for (var i = 0; i < result.length; ++i) {
        var res = result[i];
        var contestId = res.contestId;
        var index = res.problem.index;
        var lang = res.programmingLanguage;
        var urlProblemStat = 'http://codeforces.com/contest/' + contestId + '/problem/' + index;

        if (res.verdict == 'OK') {
          subIds.push( {subId: res.id, contestId: contestId, index: index, lang: lang, urlProblemStat: urlProblemStat} );
        }
      }

      for (var i = 0; i < subIds.length; ++i) {
        var subId = subIds[i].subId;
        var contestId = subIds[i].contestId;
        var problemName = subIds[i].index;
        var urlProblemStat = subIds[i].urlProblemStat;
        var lang = subIds[i].lang;

        getSourceCode(subId, contestId, function(err, sourceCode) {
          if (err) console.log(err);
          else {
            getContestName(contestId, function (err, contestName) {
              if (err) console.log(err);
              else {
                sourceCode = comment[lang] + ' ' + urlProblemStat + '\n' + sourceCode;
                console.log(contestName);
                console.log(problemName);
                console.log(sourceCode);
              }
            });
          }
        })
      }
    }
    else {
      console.log('Usage: node index.js <handle>');
      process.exit(1);
    }
  }
  else {
    console.log('Request error: ', data.status);
    process.exit(2);
  }
})


function getSourceCode (subId, contestId, callback) {
  var url = 'http://codeforces.com/contest/'+ contestId + '/submission/' + subId;
  console.log(url);
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

function writeFile (path, fileName, ext, sourceCode) {
  fs.writeFile(path + '/' + fileName + '.' + ext, sourceCode, function (err) {
    if (err) throw err;
  });
}

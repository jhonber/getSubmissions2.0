var request = require('request');
var cheerio = require('cheerio');

var handle = process.argv[2];
var url = 'http://codeforces.com/api/user.status?handle=' + handle + '&from=1&count=1';
var subIds = [];

request.get(url, function (err, res, body) {
  if (handle) {
    var data = JSON.parse(body);
    if (data.status == 'OK') {
      var result = data.result;
      for (var i = 0; i < result.length; ++i) {
        if (result[i].verdict == 'OK') {
          subIds.push( {subId: result[i].id, contestId: result[i].contestId});
        }
      }

      for (var i = 0; i < subIds.length; ++i) {
        var subId = subIds[i].subId;
        var contestId = subIds[i].contestId
        getSourceCode(subId, contestId, function(err, source) {
          if (err) console.log(err);
          getContestName(contestId, function (err, contestName){
            console.log(contestName);
            console.log(source);
          });
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

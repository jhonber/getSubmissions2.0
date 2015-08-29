var request = require('request');
var cheerio = require('cheerio');

var handle = process.argv[2];
var url = 'http://codeforces.com/api/user.status?handle=' + handle + '&from=1&count=10';
var subIds = [];

request.get(url, function (err, response, body) {
  if (handle) {
    var data = JSON.parse(body);
    var result = data.result;
    for (var i = 0; i < result.length; ++i) {
      if (result[i].verdict == 'OK') {
        subIds.push( {subId: result[i].id, contestId: result[i].contestId});
      }
    }

    for (var i = 0; i < subIds.length; ++i) {
      getSourceCode(subIds[i].subId, subIds[i].contestId, function(err, source) {
        console.log(source);
      })
    }
  }
  else {
    console.log('Usage: node index.js <handle>');
    process.exit(1);
  }
})


function getSourceCode (subId, contestId, callback) {
  var url = 'http://codeforces.com/contest/'+ contestId + '/submission/' + subId;
  console.log(url);
  request.get(url, function(error, response, body) {
    var $ = cheerio.load(body);
    var sourceCode = $('.program-source')[0].children[0].data;
    callback(null, sourceCode);
  });
}

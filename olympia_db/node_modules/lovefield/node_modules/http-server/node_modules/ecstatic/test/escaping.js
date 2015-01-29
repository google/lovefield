var test = require('tap').test,
    ecstatic = require('../'),
    http = require('http'),
    request = require('request');

var server;

test('escaping special characters', function (t) {
  server = http.createServer(ecstatic(__dirname + '/public'));
 
  server.listen(0, function () {
    var port = server.address().port;
    request.get('http://localhost:' + port + "/curimit%40gmail.com%20(40%25)", function (err, res, body) {
      t.ifError(err);
      t.equal(res.statusCode, 200);
      t.equal(body, 'index!!!\n');
      t.end();
    });
  });
});

test('server teardown', function (t) {
  server.close();

  var to = setTimeout(function () {
    process.stderr.write('# server not closing; slaughtering process.\n');
    process.exit(0);
  }, 5000);
  t.end();
});

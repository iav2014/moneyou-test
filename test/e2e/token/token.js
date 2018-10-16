var request = require('request');
var server = require('../../../server');
var should = require('should');

var url = 'http://localhost:3000/'; // only works if you launch with 3000 at http port server command
var timeout = 10000;

describe('#E2E send, server start  ', function () {
	before(function (done) {
		this.timeout(timeout);
		server.startCluster();
		setTimeout(function () {
			done();
		}, 5000);
	});
	let token={};
	it('#send - get valid token', function (done) {
		this.timeout(timeout);
		var register = {"keepalive":"60"};
		var options = {
			uri:url+'token',
			json:register
		};
		request.post(options, function (err, result) {
			should.not.exists(err);
			if (err) {
				done(err);
			}
			else {
				should.exists(result);
				token=result.body;
				console.log(token);
				done();
			}
		});
	});
});

var request = require('request');
var server = require('../../../server');
var should = require('should');

var url = 'http://localhost:3000/'; // only works if you launch with 3000 at http port server command
var timeout = 10000;

describe('#E2E send, server start  ', function () {
	before(function (done) {
		this.timeout(timeout);
		setTimeout(function () {
			done();
		}, 5000);
	});
	it('#send - send a email message', function (done) {
		this.timeout(timeout);
		var register = {"email":"ignacio.ariza@gmail.com","msg":"this is a test message"};
		var options = {
			uri:url+'send',
			json:register
		};
		request.post(options, function (err, result) {
			should.not.exists(err);
			if (err) {
				done(err);
			}
			else {
				console.log(result.body);
				should.exists(result);
				done();
			}
		});
	});
	
	it('#send - send incomplete fields', function (done) {
		this.timeout(timeout);
		var register = {"email":"ignacio.ariza@gmail.com"};
		var options = {
			uri:url+'send',
			json:register
		};
		request.post(options, function (err, result) {
			should.not.exists(err);
			if (err) {
				done(err);
			}
			else {
				console.log(result.body);
				should.exists(result);
				done();
			}
		});
	});
	
});

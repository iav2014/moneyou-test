/**
 * Created by ariza on 10/2018.
 */
const argv = require('optimist')
	.usage('Usage: $0 --ip [public a.b.c.d] --http [port] --https [port]')
	.demand(['ip', 'http', 'https'])
	.argv;
const amqp = require('amqplib/callback_api');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cluster = require('cluster');
const https = require('https');
const http = require('http');
const os = require('os'),
	cpuCount = os.cpus().length;
const mongo = require('mongodb');
let fs = require('fs');
let key = fs.readFileSync('./cert/server.key'); // your server.key && pem files
let cert = fs.readFileSync('./cert/server.pem');
let https_options = {
	key: key,
	cert: cert
};
let config = {
	rabbitmq: {
		host: 'amqp://localhost',
		exchange: 'task_queue',
		queue: 'queue3'
	},
	mongodb: {
		uri: "mongodb://localhost:27017,localhost:27018,localhost:27019/test?replicaSet=rs0",
		options: {
			keepAlive: 1,
			connectTimeoutMS: 30000,
			socketTimeoutMS: 0,
			autoReconnect: true,
			useNewUrlParser: true
		}
	}
};
// server cluster section
if (cluster.isMaster) {
	let corr_id = []; // general array shared from all workers
	console.log('isMaster');
	for (let i = 0; i < cpuCount; i++) {
		cluster.fork();
	}
	cluster.on('message', (worker, msg, handle) => {
		if (msg.topic && msg.topic === 'ADD') {
			// here we increment the array of id
			corr_id.push(msg.id);
		}
		if (msg.topic && msg.topic === 'FIND') {
			// here we increment the counter
			var pos = corr_id.indexOf(msg.id);
			if (pos >= 0) {
				console.log('Confirmed');
				corr_id.splice(pos, 1); // deleted id from array
			}
		}
	});
} else {
	let db = {};
	let mongodbConnect = (dataConnect, callback) => {
		mongo.connect(dataConnect.uri, dataConnect.options, function (err, dbs) {
			if (err) {
				console.error(err);
				return callback(err);
			}
			else {
				console.log('[%d]- connected to mongodb!->%s:%d', process.pid, dataConnect.uri);
				let db = dbs.db(dbs.s.options.dbName || db.s.databaseName);
				callback(null, {db: db, dbs: dbs});
			}
		});
	};
	let encoder= (str)=> {
		var encoded = "";
		for (var i = 0; i < str.length; i++) {
			var a = str.charCodeAt(i);
			var b = a ^ 377819129;
			//var b = a ^ 0x28;
			encoded = encoded + String.fromCharCode(b);
		}
		return encoded;
	};
	// mongodb connect ...
	mongodbConnect(config.mongodb, (err, result) => {
		if (err) {
			console.error(err);
		} else {
			db = result.db;
		}
	});
	
	// start rabbitmq client process
	let channel = null;
	let queue = null;
	// amqp queue link...
	amqp.connect(config.rabbitmq.host, (err, conn) => {
		conn.createChannel((err, ch) => {
			ch.assertQueue(config.rabbitmq.exchange, {durable: true}, (err, q) => {
				console.log(' [x] Requesting process(%d)', process.pid);
				ch.consume(q.queue, (msg) => {
					console.log('GOT confirm ', process.pid, msg.properties.correlationId);
					console.log('GOT processed:', process.pid, msg.content.toString());
					process.send({topic: 'FIND', id: msg.properties.correlationId});
				}, {noAck: true});
				channel = ch;
				queue = q;
			});
		});
	});
	// aux functions  ...
	let generateUuid = () => {
		return Math.random().toString() +
			Math.random().toString() +
			Math.random().toString();
	}
	let taskPost = (req, res, callback) => {
		let json = {};
		req.query = req.body;
		let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		console.log('[%s] - (post/send)', ip);
		json.email = encoder(req.query.email);
		json.msg = encoder(req.query.msg);
		let corr = generateUuid();
		process.send({topic: 'ADD', id: corr});
		console.log(process.pid, json);
		console.log(process.pid, corr);
		channel.sendToQueue(config.rabbitmq.queue,
			new Buffer(JSON.stringify(json).toString()),
			{correlationId: corr, replyTo: queue.queue});
		callback(null, 'put object in queue!');
	};
	let find = (data, callback) => {
		db.collection('email', function (e, coll) {
			console.log({email: encoder(data)})
			coll.find({email: encoder(data)}).toArray((err, result) => {
				if(result.length>0){
					for(let i=0;i<result.length;i++){
						result[i].email=encoder(result[i].email);
						result[i].msg=encoder(result[i].msg);
					}
				}
				callback(err, result);
			});
		});
	}
	// end aux functions
	// put routes ...
	app.use(bodyParser.json());        // to support JSON-encoded bodies
	app.use(bodyParser.urlencoded({    // to support URL-encoded bodies
		extended: true
	}));
	app.post('/send', (req, res, next) => {
		taskPost(req, res, (err, result) => {
			console.log(err || '[no error]', result);
			if (err) res.send(404);
			else {
				console.log('result', result);
				res.send(result);
			}
		});
	});
	app.post('/recover', (req, res, next) => {
		req.query = req.body;
		let email = req.query.email;
		find(email, (err, result) => {
			if (err) {
				console.error(err);
				res.sendStatus(500);
			} else {
				result.length==0?res.sendStatus(204):res.send(result);
			}
		})
	});
	app.use((req, res) => {
		res.status(404);
		res.send("route not exist");
	});
	// end routes
	// start the http & https servers ...
	https.createServer(https_options, app).listen(argv.https).on('error', (err) => {
		if (err) {
			console.error(err);
			process.exit(1);
		}
	}).on('listening', () => {
		console.log('[%d]- https rest server listening at http://%s:%d', process.pid, argv.ip, argv.https);
	});
	http.createServer(app).listen(argv.http).on('error', (err) => {
		if (err) {
			lconsole.error(err);
			process.exit(1);
		}
	}).on('listening', () => {
		console.log('[%d]- http rest server listening at http://%s:%d', process.pid, argv.ip, argv.http);
	});
	
}




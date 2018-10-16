/**
 * Created by ariza on 10/2018.
 * rabbitmq subscriber
 * @goal: scale & process user actions
 * @author: Nacho Ariza 2018
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // to avoid warning autogenerate certificates!
const amqp = require('amqplib/callback_api');
const mongo = require('mongodb');
const nodemailer = require('nodemailer');
// mongodb url data configuration
let dataConnect = {
	uri: "mongodb://localhost:27017,localhost:27018,localhost:27019/test?replicaSet=rs0",
	options: {
		keepAlive: 1,
		connectTimeoutMS: 30000,
		socketTimeoutMS: 0,
		autoReconnect: true,
		useNewUrlParser: true
	}
};
let db = {};
let mongodbConnect = (dataConnect, callback) => {
	mongo.connect(dataConnect.uri, dataConnect.options, function (err, dbs) {
		if (err) {
			console.error(err);
			return callback(err);
		}
		else {
			console.log('connected to mongodb!' + dataConnect.uri);
			let db = dbs.db(dbs.s.options.dbName || db.s.databaseName);
			callback(null, {db: db, dbs: dbs});
		}
	});
};

mongodbConnect(dataConnect, (err, result) => {
	if (err) {
		console.error(err);
	} else {
		db = result.db;
	}
});
// encoder symmetric xor based example!
let encoder = (str) => {
	let encoded = "";
	for (let i = 0; i < str.length; i++) {
		let a = str.charCodeAt(i);
		let b = a ^ 377819129;
		encoded = encoded + String.fromCharCode(b);
	}
	return encoded;
};
// where is my rabbitmq?? try to connect to localhost rabbit.
// if you want to connect to other rabbit, see rabbitmq documentation
amqp.connect('amqp://localhost', (err, conn) => {
	conn.createChannel(function (err, ch) {
		let q = 'queue3';
		ch.assertQueue(q, {durable: false});
		ch.prefetch(1);
		console.log(' [x] Awaiting RPC requests');
		ch.consume(q, (msg) => { // consumer listen
			let json = msg.content.toString();
			console.log(" [.] Get[.] - json:", json);
			console.log('id:', msg.properties.correlationId);
			console.log('response to:', msg.properties.replyTo);
			//.. process.spawn python NLP
			console.log('sending to nosql database ...');
			console.log(json.toString());
			let data = JSON.parse(json);
			insertOne(data, (err, result) => { //saved data into mongodb
				if (err) {
					console.error(err);
				} else {
					console.log('inserted!');
					ch.sendToQueue(msg.properties.replyTo,
						new Buffer(json.toString()),
						{correlationId: msg.properties.correlationId});
					ch.ack(msg);
					sendEmail(data, (err, result) => {
						if (err) {
							console.error(err);
						} else {
							console.log(result);
						}
					})
				}
			})
		});
	});
});
// mongodb functions...
let insertOne = (data, callback) => {
	db.collection('email', function (e, coll) {
		coll.insertOne(data, (err, result) => {
			callback(err, result);
		});
	});
};
// nodemailer sender ...
let sendEmail = (data, callback) => {
	// sending email
	let transporter = nodemailer.createTransport({
		host: 'mail.xxx.com',
		port: 465,
		secure: true, // true for 465, false for other ports
		auth: {
			user: 'no-reply@xxx.com', // replace by your email to practice
			pass: 'xxx' // replace by your-password
		}
	});
	let mailOptions = {
		from: 'no-reply@xxx.com',
		to: encoder(data.email),
		subject: 'send sms',
		html: '<p> this is your msg:</p><h1>' + encoder(data.msg) + '</h1>'
	};
	transporter.sendMail(mailOptions, function (error, info) { // send email to user inbox...
		if (error) {
			console.error(error);
			callback(null, info);
		}
		console.log('Email sent: ' + info.response);
		callback(null, info.response);
	})
};

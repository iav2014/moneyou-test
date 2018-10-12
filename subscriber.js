/**
 * Created by ariza on 10/2018.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // for nodemailer sec off
const amqp = require('amqplib/callback_api');
const mongo = require('mongodb');
const nodemailer = require('nodemailer');
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
amqp.connect('amqp://localhost', (err, conn) => {
	conn.createChannel(function (err, ch) {
		let q = 'queue3';
		ch.assertQueue(q, {durable: false});
		ch.prefetch(1);
		console.log(' [x] Awaiting RPC requests');
		ch.consume(q, (msg) => {
			var json = msg.content.toString();
			console.log(" [.] Get[.] - json:", json);
			console.log('id:', msg.properties.correlationId);
			console.log('response to:', msg.properties.replyTo);
			//.. process.spawn python NLP
			console.log('sending to nosql database ...');
			console.log(json.toString());
			let data=JSON.parse(json);
			insertOne(data, (err, result) => {
				if (err) {
					console.error(err);
				} else {
					console.log('inserted!');
					ch.sendToQueue(msg.properties.replyTo,
						new Buffer(json.toString()),
						{correlationId: msg.properties.correlationId});
					ch.ack(msg);
					sendEmail(data,(err,result)=>{
						if(err){
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
// mongodb functions
let insertOne = (data, callback) => {
	db.collection('email', function (e, coll) {
		coll.insertOne(data, (err, result) => {
			callback(err, result);
		});
	});
};
// nodemailer sender
let sendEmail = (data, callback) => {
	// sending email
	var transporter = nodemailer.createTransport({
		// example with google mail service
		host: 'mail.interactionmobile.com',
		port: 465,
		secure: true, // true for 465, false for other ports
		auth: {
			user: 'no-reply@interactionmobile.com', // replace by your email to practice
			pass: '7Iv0{&6NID@}' // replace by your-password
		}
	});
	var mailOptions = {
		from: 'no-reply@interactionmobile.com',
		to: encoder(data.email),
		subject: 'send sms',
		html: '<p> this is your msg:</p><h1>' + encoder(data.msg) + '</h1>'
	};
	transporter.sendMail(mailOptions, function (error, info) {
		if (error) {
			console.error(error);
			callback(null, info);
		}
		console.log('Email sent: ' + info.response);
		callback(null, info.response);
	})
}

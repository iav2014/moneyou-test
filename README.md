mone you example test

this source code consist of a  server & subscribe pattern
This code is for option-2 document of moneyou.

Requirements

• Create an API to post a message which can be delivered to a recipient via
email and keep a record of it

• Create an API to retrieve the messages sent to a particular recipient

• Think about how you can secure the above feature

Software needed

• You need a rabbitmq queue installed.

• You need a mongodb v.3.5 database in replicaset mode (see url string connection) no user and pass needec

• You need an account to nodemailer to send emails.

[server.js]
This server is create at nodejs clster mode, and enable to receive ina post method "post"
email field and msg field (x-www-form-urlencoded)
The rest method are named "send", and you can access them using http or https protocol.

command line cluster server.

example: node server.js --ip 0.0.0.0 --http 3000 --https 3443

listen all network interfaces:0.0.0.0 and publish (https) with autogenerated certificates.

Server can handle 5000 to 25000 request/second depending your processor (i5 i7) and memory (8GB or 16GB)


[send]
• read data from user & encrypt data object
• put a user email & msg into a rabbitmq queue
• response with 200 or 500 http code

[recover]

• recover data for email(s) user(s) email & msg in array object
• decrypt the mongodb data
• response with 200 or 500 http code

[subscriber.js]
it is a rabbitmq consumer that receive a message from server queue and store it at mongodb
and performs a email to user, using nodemailer.
you can launch to many consumers if you need best perfomance.
Rabbitmq send messages them using a round robin pattern

this process notify to server process ones operating has been done (ack).

Nodemailer

you must put your node mailer account:
configuration example:
var transporter = nodemailer.createTransport({
		host: 'mail.xxx.com',
		port: 465,
		secure: true, // true for 465, false for other ports
		auth: {
			user: 'no-reply@xxx.com', // replace by your email to practice
			pass: 'xxx' // replace by your-password
		}
	});

Scale up:
You can scale up server, using:
load balancer element -> point to a different server(s)
https certificate will be installed on lbe redirecting to http server port.
You can scale up server using kubernetes or aks8 (microsoft) with image docker

Security:
all api works in https mode.
server & subscriber & rabbitmq talk message with encrypt streams.
mongodb email collection saved encrypt document:
like this:

{
    "_id" : ObjectId("5bc0c95c79f9679c13a69779"),
    "email" : "ྐྞྗ྘ྚྐྖ࿗྘ྋྐྃ྘ྐྵྞྔ྘ྐྕ࿗ྚྖྔ",
    "msg" : "ྑྜྕྕྖ࿙ྎྖྋྕྜྷ"
}

(c) Nacho Ariza - 12/10/2018

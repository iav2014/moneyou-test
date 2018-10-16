**mone you example test**

this source code consist of a  server & subscribe pattern
This code is for option-2 document of moneyou.

Reasons for the desing

Design Choices
 
The architecture I used for this application has been chosen to make it work without any 
kind of cloud dependency. The code has been extracted from a mobile devices backend platform 
where no proprietary technologies wanted to be used. This platform was a second screen 
backend application. A second screen application is an accompanying mobile app of a TV show.
I have chosen the technologies because the use case of the assignment seemed pretty similar 
to this kind of platforms.
 
I was also deciding whether to use a serverless AWS Lambda function architecture but in my 
experience, Lambda functions are very slow to wake up. In my previous tests, I discovered 
that AWS Lambdas took around 200ms-9000ms to wake up and start serving requests. 
In second screen platforms, the ramp up of users is very sudden and steep and lot of requests
start reaching to the backend at the beginning of the show. With Lambda functions, their wake
up time will produce thousands of failed requests until the functions are able to respond to
the load. I wanted to avoid this use case. I found the same problem with AWS balancers: 
they need preheating and will lose requests at the very beginning of a sudden load.
 
Because of these AWS limitations, I am proposing a highly scalable, independent architecture.
The application has been designed from scratch to be able to scale horizontally, 
sharing other instances, just prepending a light proxy before them (such as HAProxy).
 
This architecture has been successfully implemented in a lot of production second screen
applications, such as Masterchef Spain (2014-2017 editions), as well as Televisa Networks 
Mexico (login & logout editions) and in a number of TV series on NBC Telemundo 
(Señor de los Cielos, Señora Acero...).
 
As you can check, I have other Github repositories where you can find more examples 
of my work, specially the usage of a socket layer for direct server-device communication
without the HTTP overhead. This type of architectures allow asynchronous bidirectional
communication between users, also using RabbitMQ.

socket.io based architecture:

https://github.com/iav2014/server-socket

api rest framework (services):

https://github.com/iav2014/ponthos-framework




Architecture

api server -> rabbitmqn-> [subscribers	1..n] -> mongodb + nodemailer					
 
this architecture has been chosen based on queues, 
since it allows horizontal growth and scaling by increasing the number of subscribers

Requirements

• Create an API to post a message which can be delivered to a recipient via
email and keep a record of it

• Create an API to retrieve the messages sent to a particular recipient

• Think about how you can secure the above feature

Software needed

• You need a rabbitmq queue installed.

• You need a mongodb v.3.5 database in replicaset mode (see url string connection) no user and pass needed

• You need an account to nodemailer to send emails.

[server.js]

This server is create at nodejs cluster mode, and enable send and reveive using "post" method 
email field and msg field (x-www-form-urlencoded) are mandatory fields.
The send method are named "send", and you can access them using http or https protocol.

command line cluster server.

example: node server.js --ip 0.0.0.0 --http 3000 --https 3443

default values: 0.0.0.0 for ip, 3000 (http) 3443 (https)

listen all network interfaces:0.0.0.0 and publish (https) with autogenerated certificates.

Server can handle 5000 to 25000 request/second depending your processor (i5 i7) and memory (8GB or 16GB)

[token]

params: keepalive in seconds

• this service generate a keep-alive token. Generate keepalive token in seconds.
If no keepalive at body param, set keepalive to 60 seconds.

[send]

params: token + email + msg

• read data from user & encrypt data object

• put a user email & msg into a rabbitmq queue

• response with 200 or 500 http code || forbidden 403 (token out of range)

[recover]
params: email + token

• recover data for email(s) user(s) email & msg in array object

• decrypt the mongodb data

• response with 200 or 500 http code || forbidden 403 (token out of range)

[subscriber.js]

it is a rabbitmq consumer that receive a message from server queue and store it at mongodb
and performs a email to user, using nodemailer.
you can launch to many consumers if you need best perfomance.
Rabbitmq workers using a round robin pattern to distribute tasks

This workers notify to server process ones operating has been done (ack).

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
then https certificate will be installed on lbe redirecting to http server port.
You can scale up server using kubernetes or aks8 (microsoft) with image docker.
Dockerfile is not present in this code review.

Security:

• all api works in https mode and send data with post.

• It was relatively easy to add a temporary token in the request that would allow the operation
to be performed in a user-defined time. 
In this example we are using keep-alive token.

• server & subscriber & rabbitmq work with message with encrypt objects.

• mongodb email collection saved encrypt document:

It looks like this:

{
    "_id" : ObjectId("5bc0c95c79f9679c13a69779"),
    "email" : "ྐྞྗ྘ྚྐྖ࿗྘ྋྐྃ྘ྐྵྞྔ྘ྐྕ࿗ྚྖྔ",
    "msg" : "ྑྜྕྕྖ࿙ྎྖྋྕྜྷ"
}

original object:

{
        "_id": "5bc0c95c79f9679c13a69779",
        "email": "ignacio.ariza@gmail.com",
        "msg": "hello world"
}

[test]

You can test this e2e services with mocha.

(c) Nacho Ariza - 12/10/2018

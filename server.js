var 	express = require('express.io'),
	uuid = require('uuid'),
	config = require('./config.json'),
	app = express();

// Set up server
app.http().io();
app.use(express.cookieParser());
app.use(express.session({
	cookie: {
		maxAge: 36000000,
		httpOnly: false
	},
	secret: config.server_secret
}));

app.disconnectEvent = function () {};

// Setup events
app.io.sockets.on('connection', function (socket) {
    socket.on('disconnect', function () {
    	var hs = socket.handshake;
    	if (hs && hs.session && hs.session.room) {
    		app.disconnectEvent(hs.session.room,hs.session.body);
    	}
    });
});

// Setup public folder
app.use(express.static(process.cwd() + '/public'));
app.listen(config.server_port);

module.exports = app;

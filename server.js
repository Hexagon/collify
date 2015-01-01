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

// Setup public folder
app.use(express.static(process.cwd() + '/public'));
app.listen(config.server_port);

module.exports = app;

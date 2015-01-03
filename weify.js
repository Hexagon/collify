var server = require('./server.js'),
	spotify = require('./spotify.js'),
	routes = require('./routes.js'),
	rooms = require('./rooms.js');

// File structure
// ------------------------------------------------------------------------------------------
// + public/		=	Static assets. Could be served through nginx or yout front of 
//				choice (we should probably add a config parameter that disables 
//				nodes built-in static asset server)
//   server.js 		= 	Core http/websockets setup
//   rountes.js 	= 	Handlers for specific websockets events and/or URL-requests
//   rooms.js 		= 	Keeping track of current rooms, this currently takes care of 
//				broadcasting track-lists to the rooms, which feels wrong
//   config.json	=	Configuration of Spotify API keys, server port, server secret
// ------------------------------------------------------------------------------------------

// ToDo | [ ] = Free to grab, [X] = Work in progress
// ------------------------------------------------------------------------------------------
// [ ]  Cleanup of user body, no need to passa around all info
// [ ]  Sanitation of all user supplied (direct and indirect) data
// [ ] 	Persistent data store, currently all rooms/votes/data are stored in memory 
//	(javascript objects). Which kind of sucks in event of a server restart.
// [ ]	Use spotify api to save current room queue as a playlist
// [ ]	Display which users have voted (up AND down) a song
// ...
// ------------------------------------------------------------------------------------------

server.io.route('join', 	function(req) 	{ routes.join(req); 	});
server.io.route('vote', 	function(req) 	{ routes.vote(req); 	});
server.io.route('votedown',	function(req) 	{ routes.voteDown(req);	});
server.io.route('ready', 	function(req) 	{ routes.ready(req); 	});
server.io.route('message', 	function(req) 	{ routes.message(req); 	});

// Start playing
rooms.startCheckLoop();

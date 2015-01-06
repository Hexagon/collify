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
// [ ]  Replace THE workaround.
// [ ]	Use spotify api to save current room queue as a playlist
// [ ]	Display which users have voted (up AND down) a song
// [ ]  Chat history is not cleared when switching room
// [ ]  Remove dependency on uuid (readme and routes.js), this is no longer used
// ...
// ------------------------------------------------------------------------------------------

server.io.route('vote', 	function(req) 	{ routes.vote(req); 	});
server.io.route('votedown',	function(req) 	{ routes.voteDown(req);	});
server.io.route('ready', 	function(req) 	{ routes.ready(req); 	});
server.io.route('leave', 	function(req) 	{ routes.leave(req); 	});
server.io.route('message', 	function(req) 	{ routes.message(req); 	});
server.io.route('toplist', 	function(req) 	{ routes.topList(req); 	});

// Start playing
rooms.startCheckLoop();
var 	uuid = require('uuid'),
	rooms = require('./rooms.js');

sessionOk = function (request) {
	if (request.session.uuid && request.session.name) {
		return true;
	} else {
		return false;
	}
}

roomOk = function (request) {
	if (sessionOk(request) && request.session.room) {
		return true;
	} else {
		return false;
	}
}

joinRoom = function (req, room) {

		// Create room if it doesnt exist
		if (!rooms.exists(room)) {
			rooms.create(room);
		}

		// Connect socket to room
		req.io.join(room);

		// Update session
		req.session.room = room;
		req.session.save(function() {
			req.io.emit('joined', room);
		});

		// Add user
		rooms.join(room,req.session.body);
}

var routes = {
	join: function (req) {
		if (!sessionOk(req)) {
			req.io.emit('denied');
			return false;
		}
		joinRoom(req, req.data.room);
	},
	vote: function (req) {
		if (!roomOk(req)) {
			req.io.emit('denied');
			return false;
		}
		rooms.voteTrack(req.session.room, req.session.uuid, req.data.data);
		rooms.broadcastTracks(req.session.room);
	},
	voteDown: function (req) {
		if (!roomOk(req)) {
			req.io.emit('denied');
			return false;
		}
		rooms.voteDownTrack(req.session.room, req.session.uuid, req.data.data.id);
		rooms.broadcastTracks(req.session.room);
	},
	ready: function (req) {
		var room;
		if (!sessionOk(req)) {
			req.io.emit('denied');
			return false;
		}if (!roomOk(req)) {
			req.io.emit('authenticated',req.session.body);
			return false;
		} else {
			joinRoom(req, req.session.room);
			rooms.sendTracks(req);
			curRoom = rooms.get(req.session.room);
			if (curRoom.isPlaying) {
				var startDuration = new Date((Date.now() - curRoom.isPlaying)).toLocaleTimeString().split(":");
				startDuration = parseInt(startDuration[1],10) + ':' + startDuration[2];
				req.io.emit('play',{track:curRoom.nowPlaying,time:startDuration});
				console.log(startDuration);
			}
		
		}
	},
	message: function (req) {
		if (!roomOk(req)) {
			req.io.emit('denied',req.session.body);
			return false;
		} else {
			rooms.sendMessage(req);
		}
	}
}; module.exports = routes;

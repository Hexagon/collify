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

var routes = {
	join: function (req) {
		if (!sessionOk(req)) {
			req.io.emit('denied');
			return false;
		}

		// Create room if it doesnt exist
		if (!rooms.exists(req.data.room)) {
			rooms.create(req.data.room);
		}

		req.io.join(req.data.room);

		// Update session
		req.session.room = req.data.room;
		req.session.save(function() {
			req.io.emit('joined', req.data.room);
		});
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
			req.io.join(req.session.room);
			req.io.emit('joined',req.session.room);
			rooms.broadcastTracks(req.session.room);
			curRoom = rooms.get(req.session.room);
			if (curRoom.isPlaying) {
				var startDuration = new Date((Date.now() - curRoom.isPlaying)).toLocaleTimeString().split(":");
				startDuration = parseInt(startDuration[1],10) + ':' + startDuration[2];

				req.io.emit('play',{track:curRoom.nowPlaying,time:startDuration});
				console.log(startDuration);
			}
		
		}

	}
}; module.exports = routes;

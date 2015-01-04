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

joinRoom = function (req, room, callback) {

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
			if(callback !== undefined) callback();
		});

		// Add user
		rooms.join(room,req.session.body);
}

leaveRoom = function (req, callback) {

		// Leave room
		req.io.leave(req.session.room);

		// Update session
		req.session.room = undefined;
		req.session.save(function() {
			if(callback !== undefined) callback();
		});

		// Add user
		rooms.join(room,req.session.body);
}

var routes = {
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
		if (!sessionOk(req)) {
			req.io.emit('denied');
			return false;
		}if (!roomOk(req) && (req.data === undefined || (req.data && req.data.room === undefined))) {
			req.io.emit('authenticated',req.session.body);
			return false;
		} else {
			var room = req.session.room ? req.session.room : req.data.room;
			room = room.toLowerCase();
			joinRoom(req, room, function() {
				rooms.sendTracks(req);
				curRoom = rooms.get(room);
				if (curRoom.isPlaying) {
					var startDuration = new Date((Date.now() - curRoom.isPlaying)).toLocaleTimeString().split(":");
					startDuration = parseInt(startDuration[1],10) + ':' + startDuration[2];
					req.io.emit('play',{track:curRoom.nowPlaying,time:startDuration});
				}
			});
		}
	},
	leave: function (req) {
		var room;
		if (!sessionOk(req)) {
			req.io.emit('denied');
			return false;
		} else {
			leaveRoom(req, function() {
				req.io.emit('authenticated',req.session.body);
			});
		}
	},
	message: function (req) {
		if (!roomOk(req)) {
			req.io.emit('denied',req.session.body);
			return false;
		} else {
			rooms.sendMessage(req);
		}
	},
	topList: function (req) {
		if (!sessionOk(req)) {
			req.io.emit('denied',req.session.body);
			return false;
		} else {
			rooms.sendToplist(req);
		}
	}
}; module.exports = routes;

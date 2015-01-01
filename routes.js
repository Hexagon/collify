var uuid = require('uuid'),
	rooms = require('./rooms.js');

sessionOk = function (request) {
	if (request.session.uuid && request.session.name && request.session.room) {
		return true;
	} else {
		return false;
	}
}

var routes = {

	auth: function (req) {
		// We don't want the uuid to change on logout, to prevent double votes
		req.session.uuid = uuid.v4();
		req.session.name = req.data.username;
		req.session.room = req.data.room;

		// Create room if it doesnt exist
		if (!rooms.exists(req.data.room)) {
			rooms.create(req.data.room);
		}

		req.io.join(req.data.room);

		req.session.save(function() {
			req.io.emit('accepted');
		});
	},

	vote: function (req) {
		if (!sessionOk(req)) {
			req.io.emit('denied');
			return false;
		}

		rooms.voteTrack(req.session.room, req.session.uuid, req.data.data);
		rooms.broadcastTracks(req.session.room);
	},

	voteDown: function (req) {
		if (!sessionOk(req)) {
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
		}

		var room; 

		req.io.join(req.session.room);
	    rooms.broadcastTracks(req.session.room);

	    curRoom = rooms.get(req.session.room);
	    if(curRoom.isPlaying) {
	    	var startDuration = new Date((Date.now() - curRoom.isPlaying)).toLocaleTimeString().split(":");
	    	startDuration = parseInt(startDuration[1],10) + ':' + startDuration[2];

	    	req.io.emit('play',{track:curRoom.nowPlaying,time:startDuration});
	    	console.log(startDuration);
	    }
	}

}; module.exports = routes;
var 	rooms = [],
	server = require('./server.js');

sortTracks = function (room) {

	// Order tracks
	var 	srcTracks = JSON.parse(JSON.stringify(rooms[room].tracks)),
		dstTracks = {},
		nextTrack;

	while(nextTrack = nextTrackID(srcTracks)) {
		dstTracks[nextTrack] = JSON.parse(JSON.stringify(srcTracks[nextTrack]));
		delete srcTracks[nextTrack];
	}

	rooms[room].tracks = dstTracks;

};

doBroadcastTracks = function (room) {
	sortTracks(room);
	server.io.room(room).broadcast('tracks',rooms[room].tracks);
};

nextTrackID = function (useTracks) {

	// Find max amount of votes
	var 	maxVotes = 0,
		minLastPlayed = Infinity,
		nextTrack = false,
		curTrack;
	for(t in useTracks) {
		curTrack = useTracks[t];
		if ((curTrack.votes.length-curTrack.downvotes.length) > maxVotes) {
			maxVotes = (curTrack.votes.length-curTrack.downvotes.length);
		}
	}

	// Find the song that was played longest ago
	for(t in useTracks) {
		curTrack = useTracks[t];
		if((curTrack.votes.length-curTrack.downvotes.length) === maxVotes && curTrack.lastplayed < minLastPlayed) {
			nextTrack = curTrack.id;
			minLastPlayed = curTrack.lastplayed;
		}
	}

	return nextTrack;

};

checkPlaying = function () {
	for (room in rooms) {
		var 	curRoom = rooms[room],
			nextTrack;
		if (!curRoom.isPlaying || (curRoom.isPlaying && Date.now() > curRoom.isPlaying + curRoom.nowPlaying.duration_ms + 5000)) {
			nextTrack = nextTrackID(curRoom.tracks);
			if (nextTrack) {
				curRoom.isPlaying = Date.now();
				// Reset votes
				curRoom.tracks[nextTrack].votes = new Array();
				curRoom.tracks[nextTrack].downvotes = new Array();
				// Reset last played
				curRoom.tracks[nextTrack].lastplayed = Date.now();
				curRoom.nowPlaying = curRoom.tracks[nextTrack];
				server.io.room(room).broadcast('play',{track:curRoom.nowPlaying,time:false});
				doBroadcastTracks(room);
			}
		}
	}
	setTimeout(checkPlaying,1000);
};

module.exports = {
	exists: function (name) {
		if (rooms[name] === undefined) {
			return false;
		} else {
			return true;
		}
	},
	create: function (name) {
		if (rooms[name] === undefined) {
			rooms[name] = {
				tracks: {},
				isPlaying: false,
				nowPlaying: false
			};
			return true;
		} else {
			return false;
		}
	},
	voteTrack: function (room, user, track) {
		if (rooms[room].tracks[track.id]===undefined) {
			rooms[room].tracks[track.id]=track;
			rooms[room].tracks[track.id].votes = new Array();
			rooms[room].tracks[track.id].downvotes = new Array();
		}

		if (rooms[room].tracks[track.id].votes.indexOf(user) === -1) {
			if(rooms[room].tracks[track.id].votes.length===0) {
				rooms[room].tracks[track.id].firstvote = Date.now();
				rooms[room].tracks[track.id].lastplayed = 0;
			}
			rooms[room].tracks[track.id].votes.push(user);
		}
	},
	voteDownTrack: function (room, user, id) {
		if (rooms[room].tracks[id].downvotes.indexOf(user) === -1) {
			rooms[room].tracks[id].downvotes.push(user);
		}
	},
	get: function (name) {
		return rooms[name];
	},
	broadcastTracks: function (room) {
		doBroadcastTracks(room);
	},
	startCheckLoop: function() {
		checkPlaying();
	}
};

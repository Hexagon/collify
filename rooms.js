var 	rooms = {},
	server = require('./server.js'),
	fs = require('fs'),
	crypto = require('crypto');

sortTracks = function (room) {

	// Order tracks
	var srcTracks = JSON.parse(JSON.stringify(rooms[room].tracks)),
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

broadcastUsers = function (room) {
	server.io.room(room).broadcast('users',rooms[room].users);
};

doSendToplist = function (req) {
	var roomsArr = new Array();
	for (var key in rooms) {
		if (rooms.hasOwnProperty(key)) {
			roomsArr.push({name: key, cnt: rooms[key].users.length ? rooms[key].users.length : 0});
		}
	}
	roomsArr.sort(function(a,b){return b.cnt - a.cnt});
	req.io.emit('toplist',roomsArr.slice(0,5));
};

nextTrackID = function (useTracks) {

	// Find max amount of votes
	var 	maxVotes = -Infinity,
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
		if (!curRoom.isPlaying || (curRoom.isPlaying && Date.now() > curRoom.isPlaying + curRoom.nowPlaying.duration_ms + 500)) {
			nextTrack = nextTrackID(curRoom.tracks);
			if (nextTrack) {
				curRoom.isPlaying = Date.now();
				// Reset votes
				curRoom.tracks[nextTrack].votes = new Array();
				curRoom.tracks[nextTrack].downvotes = new Array();
				// Reset last played
				curRoom.tracks[nextTrack].lastplayed = Date.now();
				curRoom.nowPlaying = curRoom.tracks[nextTrack];
				server.io.room(room).broadcast('play',{track:curRoom.nowPlaying,time:false,time_raw:(Date.now() - curRoom.isPlaying)});
				doBroadcastTracks(room);
			}
		}
	}
	setTimeout(checkPlaying,1000);
};

var exposed = {};

exposed.sendMessage = function (user, room, message, type) {
	server.io.room(room).broadcast(
		'message',
		{
			user:user,
			message:message,
			type:type
		}
	);
};
exposed.exists = function (name, callback) {
	if (rooms[name] === undefined) {
		exposed.load(
			name, 
			function() {
				callback (true);
			},
			function() {
				callback (false);
			}
		);
	} else {
		callback (true);
	}
};
exposed.create = function (name) {
	if (rooms[name] === undefined) {
		rooms[name] = {
			tracks: {},
			users: {},
			isPlaying: false,
			nowPlaying: false
		};

		// Save to file
		exposed.save(name);

		return true;
	} else {
		return false;
	}
};
exposed.save = function (room, success, error) {
	if (rooms[room] !== undefined) {
		var roomClone = JSON.parse(JSON.stringify(rooms[room])),
			roomNameHash = crypto.createHash('sha1').update(room).digest('hex');

		// Clear users before saving
		roomClone.users = {};
		
		fs.writeFile("db/"+roomNameHash, JSON.stringify(roomClone), function(err) {
		    if(err) {
		        error && error();
		    } else {
		        success && success();
		    }
		});
	} else {
		error && error();
	}
};
exposed.load = function (room, success, error) {
	console.log('Loading');
	var roomNameHash = crypto.createHash('sha1').update(room).digest('hex');
	fs.readFile('db/' + roomNameHash, function read(err, data) {
	    if (err) {
	        error && error();
	        return;
	    }
	    rooms[room] = JSON.parse(data);
	    success && success();
	});
};
exposed.join = function (room,body) {
	exposed.sendMessage(body,room,'Joined this room','system');
	rooms[room].users[body.id] = body;
	broadcastUsers(room);
};
exposed.leave = function (room,body) {
	exposed.sendMessage(body,room,'Left this room','system');

	delete rooms[room].users[body.id];
	broadcastUsers(room);
};
exposed.voteTrack = function (room, user, track) {

	var added = false, voted = false;
	if (rooms[room].tracks[track.id]===undefined) {
		exposed.sendMessage(user,room,'Added ' + track.name,'system');
		added = true;

		rooms[room].tracks[track.id]={
			id: track.id,
			name: track.name,
			duration_ms: track.duration_ms,
			album: {
				images: track.album.images,
				name: track.album.name
			},
			artists: track.artists,
			added: {
				by: user,
				at: Date.now()
			}
		};

		rooms[room].tracks[track.id].votes = new Array();
		rooms[room].tracks[track.id].downvotes = new Array();

	}

	if (rooms[room].tracks[track.id].votes.indexOf(user.id) === -1) {
		voted = true;

		if (!added) exposed.sendMessage(user,room,'Voted for ' + track.name,'system');

		if(rooms[room].tracks[track.id].votes.length===0) {
			rooms[room].tracks[track.id].firstvote = Date.now();
			rooms[room].tracks[track.id].lastplayed = 0;
		}

		rooms[room].tracks[track.id].votes.push(user.id);
	}

	if (added || voted) {
		exposed.save(room);
	}

};
exposed.voteDownTrack = function (room, user, track) {
	if (rooms[room].tracks[track.id].downvotes.indexOf(user.id) === -1) {

		exposed.sendMessage(user,room,'Voted down ' + track.name,'system');

		rooms[room].tracks[track.id].downvotes.push(user.id);

		exposed.save(room);
	}
};
exposed.get = function (name) {
	return rooms[name];
},
exposed.broadcastTracks = function (room) {
	doBroadcastTracks(room);
};
exposed.sendTracks = function (req) {
	req.io.emit('tracks',rooms[req.session.room].tracks);
},
exposed.startCheckLoop = function () {
	checkPlaying();
};
exposed.sendToplist = function (req) {
	doSendToplist(req);
};

server.disconnectEvent = function(room,body) {
	exposed.leave(room,body);
	for (room in rooms) {
		exposed.save(room);
	}
};

module.exports = exposed;
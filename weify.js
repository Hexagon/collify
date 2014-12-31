var express = require('express.io'),
	uuid = require('uuid'),
	app = express(),
	rooms = [];

app.http().io();
app.use(express.cookieParser());
app.use(express.session({
  cookie: {
    maxAge: 36000000,
    httpOnly: false
  },
  secret: 'WhamBlamSecretSlam'
}));

sessionOk = function (request) {
	if (request.session.uuid && request.session.name && request.session.room) {
		return true;
	} else {
		return false;
	}
}

nextTrackID = function (useTracks) {

	// Find max amount of votes
	var maxVotes = 0,
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
		if((curTrack.votes.length-curTrack.downvotes.length) == maxVotes && curTrack.lastplayed < minLastPlayed) {
			nextTrack = curTrack.id;
			minLastPlayed = curTrack.lastplayed;
		}
	}

	return nextTrack;

};

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

broadcastTracks = function (room) {
	sortTracks(room);
    app.io.room(room).broadcast('tracks',rooms[room].tracks);
};

checkPlaying = function () {
	for(room in rooms) {
		var curRoom = rooms[room],
			nextTrack;
		if(!curRoom.isPlaying || (curRoom.isPlaying && Date.now() > curRoom.isPlaying + curRoom.nowPlaying.duration_ms + 5000)) {
			nextTrack = nextTrackID(curRoom.tracks);
			if(nextTrack) {
				curRoom.isPlaying = Date.now();
				// Reset votes
				curRoom.tracks[nextTrack].votes = new Array();
				curRoom.tracks[nextTrack].downvotes = new Array();
				// Reset last played
				curRoom.tracks[nextTrack].lastplayed = Date.now();
				curRoom.nowPlaying = curRoom.tracks[nextTrack];
				app.io.room(room).broadcast('play',curRoom.nowPlaying);
				broadcastTracks(room);
			}
		}
			
	}
	setTimeout(checkPlaying,1000);
};

app.io.route('auth', function(req) {

	// We don't want the uuid to change on logout, to prevent double votes
	req.session.uuid = uuid.v4();
	req.session.name = req.data.username;
	req.session.room = req.data.room;

	// Create room if it doesnt exist
	if (rooms[req.data.room] === undefined) {
		rooms[req.data.room] = {};
		rooms[req.data.room].tracks = {};
		rooms[req.data.room].isPlaying = false;
		rooms[req.data.room].nowPlaying = false;
	}
	req.io.join(req.data.room);

	req.session.save(function() {
		req.io.emit('accepted');
	});
});

app.io.route('vote', function(req) {
	if (!sessionOk(req)) {
		req.io.emit('denied');
		return false;
	}

	var data = req.data.data,
		user = req.session.uuid;

    if(rooms[req.session.room].tracks[data.id]===undefined) {
    	rooms[req.session.room].tracks[data.id]=data;
    	rooms[req.session.room].tracks[data.id].votes = new Array();
    	rooms[req.session.room].tracks[data.id].downvotes = new Array();
    }

	if(rooms[req.session.room].tracks[data.id].votes.indexOf(user) === -1) {
		if(rooms[req.session.room].tracks[data.id].votes.length===0) {
			rooms[req.session.room].tracks[data.id].firstvote = Date.now();
			rooms[req.session.room].tracks[data.id].lastplayed = 0;
		}
		rooms[req.session.room].tracks[data.id].votes.push(user);
	}

	broadcastTracks(req.session.room);
});

app.io.route('votedown', function(req) {
	if (!sessionOk(req)) {
		req.io.emit('denied');
		return false;
	}

	var data = req.data.data,
		user = req.data.user;

	if(rooms[req.session.room].tracks[data.id].downvotes.indexOf(user) === -1) {
		rooms[req.session.room].tracks[data.id].downvotes.push(user);
	}

	broadcastTracks(req.session.room);
});

app.io.route('ready', function(req) {
	if (!sessionOk(req)) {
		req.io.emit('denied');
		return false;
	}

	req.io.join(req.session.room);
    req.io.emit('tracks',rooms[req.session.room].tracks);
    if(rooms[req.session.room].isPlaying) {
    	req.io.emit('play',rooms[req.session.room].nowPlaying);
    }
});

// Setup public folder
app.use(express.static(process.cwd() + '/public'));
app.listen(7076);

// Start playing
checkPlaying();

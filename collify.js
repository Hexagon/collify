var express = require('express.io'),
	app = express(),
	tracks = {},
	isPlaying = false,
	nowPlaying = false;

app.http().io();

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

sortTracks = function () {

	// Order tracks
	var srcTracks = JSON.parse(JSON.stringify(tracks)),
		dstTracks = {},
		nextTrack;

	console.log(srcTracks);

	while(nextTrack = nextTrackID(srcTracks)) {
		dstTracks[nextTrack] = JSON.parse(JSON.stringify(srcTracks[nextTrack]));
		delete srcTracks[nextTrack];
	}

	tracks = dstTracks;

};

broadcastTracks = function () {
	sortTracks();
    app.io.broadcast('tracks',tracks);
};

checkPlaying = function () {
	var nextTrack;
	if(!isPlaying || (isPlaying && Date.now() > isPlaying + nowPlaying.duration_ms + 5000)) {
		nextTrack = nextTrackID(tracks);
		if(nextTrack) {
			isPlaying = Date.now();
			// Reset votes
			tracks[nextTrack].votes = new Array();
			tracks[nextTrack].downvotes = new Array();
			// Reset last played
			tracks[nextTrack].lastplayed = Date.now();
			nowPlaying = tracks[nextTrack];
			app.io.broadcast('play',nowPlaying);
			broadcastTracks();
			console.log('Playing ',nowPlaying.name);
		} else {
			console.log('Waiting...');
		}
	} else if ( isPlaying ) {
		console.log( Math.floor(((isPlaying + nowPlaying.duration_ms + 1000) - Date.now()) / 1000) + ' s left til next song.');
	} 
	setTimeout(checkPlaying,1000);
};

app.io.route('vote', function(req) {
	
	var data = req.data.data,
		user = req.data.user;

    if(tracks[data.id]===undefined) {
    	tracks[data.id]=data;
    	tracks[data.id].votes = new Array();
    	tracks[data.id].downvotes = new Array();
    }

	if(tracks[data.id].votes.indexOf(user) === -1) {
		if(tracks[data.id].votes.length===0) {
			tracks[data.id].firstvote = Date.now();
			tracks[data.id].lastplayed = 0;
		}
		tracks[data.id].votes.push(user);
	}

	broadcastTracks();
});

app.io.route('votedown', function(req) {
	
	var data = req.data.data,
		user = req.data.user;

	if(tracks[data.id].downvotes.indexOf(user) === -1) {
		tracks[data.id].downvotes.push(user);
	}

	broadcastTracks();
});

app.io.route('ready', function(req) {
    req.io.emit('tracks',tracks);
    if(isPlaying) {
    	req.io.emit('play',nowPlaying);
    }
});


// Setup public folder
app.use(express.static(process.cwd() + '/public'));
app.listen(7076);

// Start playing
checkPlaying();

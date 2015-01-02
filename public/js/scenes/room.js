var resultsPlaceholder = document.getElementById('results'),
    spotiFrame = document.getElementById('spotiframe'),
    queueBox = document.getElementById('queuebox'),

    npArtist = document.getElementById('np_artist'),
    npName = document.getElementById('np_name'),
    npAlbum = document.getElementById('np_album'),
    npAlbumArt = document.getElementById('np_albumart'),
    npDuration = document.getElementById('np_duration'),

    searchStringElm = document.getElementById('searchstring'),
    searchString;

var fetchTracks = function (albumId, callback) {
    ajax.get(
        'https://api.spotify.com/v1/albums/' + albumId,
        {},
        function (response) {
            callback(response);
        }
    );
};

var voteUpTrack = function (target) {
    var track = JSON.parse(target.target.data);
    io.emit('vote',{data: track});
    resultbox.innerHTML = '';
};

var voteDownTrack = function (target) {
    var track = JSON.parse(target.target.data);
    io.emit('votedown',{data: track});
    resultbox.innerHTML = '';
};

var playTrack = function (data) {
    if(data && data.track.id) {

        // Desktop player
        if(data.time!==false) {
            console.log('spotify:track:'+data.track.id+'#'+data.time);
            location.href='spotify:track:'+data.track.id+'#'+data.time;
        } else {
            location.href='spotify:track:'+data.track.id;
        }


        /* ToDo: Use webplayer as fallback
        // Web player
        var url = 'https://play.spotify.com/track/'+data.id,
            spotiplayer=window.open(url,'spotiplayer');
        */

        // Try to regain focus
        window.focus();

        // Update GUI
        npArtist.innerHTML = data.track.artists[0].name;
        npName.innerHTML = data.track.name;
        npAlbum.innerHTML = data.track.album.name;
        npAlbumArt.style.backgroundImage = "URL('"+data.track.album.images[1].url+"')";
        npDuration.innerHTML = new Date(data.track.duration_ms).toLocaleTimeString();
           
    }
    return false;
};

var processSearchResult = function (response) {
    var obj,
        resultbox = document.getElementById('resultbox'),
        curTrack;

    resultbox.innerHTML = '';

    if(obj = JSON.parse(response)) {
        console.log(obj);
        if(obj.tracks && obj.tracks.items.length > 0 ) {
            for(track in obj.tracks.items) {
                curTrack = obj.tracks.items[track];

                var newElm = document.createElement("div");
                newElm.id = curTrack.id;

                var clearFixElement = document.createElement("div");
                clearFixElement.className = "clearfix";

                var vuElement = document.createElement("i");
                vuElement.className = "vote fa fa-plus-circle";
                vuElement.data = JSON.stringify(curTrack);
                vuElement.addEventListener('click', voteUpTrack);

                newElm.className = 'track searchresult';
                newElm.innerHTML = '<div class="tr_votes"> - </div>';
                newElm.innerHTML += '<div class="tr_albumart" style="background: URL('+curTrack.album.images[2].url+')"></div>';
                newElm.innerHTML += '<div class="tr_artist">'+curTrack.name+'</div>';
                newElm.innerHTML += '<div class="dash">-</div>';
                newElm.innerHTML += '<div class="tr_name">'+curTrack.artists[0].name+'</div>';

                newElm.appendChild(vuElement);
                newElm.appendChild(clearFixElement);

                resultbox.appendChild(newElm);

            }
        } else {
            resultbox.innerHTML = 'NUL!';
        }
    } else {
        resultbox.innerHTML = 'NUL!';
    }
};

var searchTracks = function (query) {
    ajax.get(
       'https://api.spotify.com/v1/search',
        {
            q: query,
            type: 'track'
        },
        processSearchResult
    );
};

searchStringElm.addEventListener('keypress',function(e) {
    if(e.keyCode===13) {
        searchTracks(searchStringElm.value);
        searchStringElm.value = '';
    }
});

io.on('play', function(data) {
   playTrack(data);
});

io.on('tracks', function(data) {
    var obj,
        curTrack;

    queuebox.innerHTML = '';

    if(data) {
        for(track in data) {
            curTrack = data[track];

            var clearFixElement = document.createElement("div");
            clearFixElement.className = "clearfix";

            var vuElement = document.createElement("i");
            vuElement.className = "vote fa fa-arrow-circle-up";
            vuElement.data = JSON.stringify(curTrack);
            vuElement.addEventListener('click', voteUpTrack);

            var vdElement = document.createElement("i");
            vdElement.className = "vote fa fa-arrow-circle-down";
            vdElement.data = JSON.stringify(curTrack);
            vdElement.addEventListener('click', voteDownTrack);

            var newElm = document.createElement("div");
            newElm.id = curTrack.id;
            newElm.className = 'track';
            newElm.innerHTML = '<div class="tr_votes">'+(curTrack.votes.length-curTrack.downvotes.length)+'</div>';
            newElm.innerHTML += '<div class="tr_albumart" style="background: URL('+curTrack.album.images[2].url+')"></div>';
            newElm.innerHTML += '<div class="tr_artist">'+curTrack.name+'</div>';
            newElm.innerHTML += '<div class="dash">-</div>';
            newElm.innerHTML += '<div class="tr_name">'+curTrack.artists[0].name+'</div>';
            
            newElm.appendChild(vdElement);
            newElm.appendChild(vuElement);
            newElm.appendChild(clearFixElement);

            queuebox.appendChild(newElm);

        }
    } else {
        queuebox.innerHTML = 'NUL!';
    }
});
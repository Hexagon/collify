var resultsPlaceholder = document.getElementById('results'),
    spotiFrame = document.getElementById('spotiframe'),
    queueBox = document.getElementById('queuebox'),

    npArtist = document.getElementById('np_artist'),
    npName = document.getElementById('np_name'),
    npAlbum = document.getElementById('np_album'),
    npAlbumArt = document.getElementById('np_albumart'),
    npDuration = document.getElementById('np_duration'),

    participants = document.getElementById('participants'),

    searchStringElm = document.getElementById('searchstring'),
    message = document.getElementById('message'),
    historyContainer = document.getElementById('history'),

    roomName = document.getElementById('room_name'),

    leave = document.getElementById('leave'),

    popup_warning = document.getElementById('popup_warning'),
    try_again = document.getElementById('try_again'),

    searchString,
    users = {},
    messages = [],

    nowPlaying;

var refresh = function () {
    if (nowPlaying) {
        var prc = Math.round((Date.now() - nowPlaying.started) / nowPlaying.track.duration_ms*100);
        // ToDo: Nice progress bar
        // Elapsed time (0-100) is available in the prc variable, this is updated once a second
    }
    setTimeout(refresh,1000);
}; refresh();

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

var changeTrack = function () {

        // WORKAROUND START: Change track in desktop player ---------------------------
        var url,w;
        if(nowPlaying.time!==false) {
            url='spotify:track:'+nowPlaying.track.id+'#'+nowPlaying.time;
        } else {
            url='spotify:track:'+nowPlaying.track.id;
        }

        // Try to open window
        w=window.open('', '', 'width=200,height=30');

        // Show warning if popups are blocked
        if (w && w.document) {
            // Popups not blocked

            w.document.write('<div>Weify changing track...</div><script>window.location.href=\''+url+'\';</script>');
            // Needed for chrome and safari
            w.document.close();
            hidePopupBlockerWarning();
            setTimeout(function() { w.close(); },1500);
        } else {
            // Popups blocked
            showPopupBlockerWarning();
            // Use workaround
            location.href = url;
        }
        // WORKAROUND END ------------------------------------------------------------

};

var showPopupBlockerWarning = function (url) {
    popup_warning.style.display = 'block';
};

var hidePopupBlockerWarning = function (url) {
    popup_warning.style.display = 'none';
}; hidePopupBlockerWarning();

var playTrack = function (data) {
    if(data && data.track.id) {

        nowPlaying = {
            track:data.track,
            time:data.time,
            started:(Date.now()-data.time_raw)
        };

        changeTrack(data);

        // Try to regain focus
        window.focus();

        // Update GUI
        npArtist.innerHTML = data.track.artists[0].name;
        npName.innerHTML = data.track.name;
        npAlbum.innerHTML = data.track.album.name;
        npAlbumArt.style.backgroundImage = "URL('"+data.track.album.images[1].url+"')";

        var durationString = new Date(data.track.duration_ms).toLocaleTimeString();
        npDuration.innerHTML = durationString.substr(durationString.length - 5);
           
    }
    return false;
};

var processSearchResult = function (response) {
    var obj,
        resultbox = document.getElementById('resultbox'),
        curTrack;

    resultbox.innerHTML = '';

    if(obj = JSON.parse(response)) {
        if(obj.tracks && obj.tracks.items.length > 0 ) {
            for(track in obj.tracks.items) {
                curTrack = obj.tracks.items[track];

                var newElm = document.createElement("div");
                newElm.id = curTrack.id;

                var clearFixElement = document.createElement("div");
                clearFixElement.className = "clearfix";

                var vuElement = document.createElement("i");
                vuElement.className = "vote fa fa-plus-circle link mouseover ";
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

message.addEventListener('keypress',function(e) {
    if(e.keyCode===13 && message.value.length > 0) {
        io.emit('message',message.value);
        message.value = '';
    }
});

leave.addEventListener('click',function(e) {
    io.emit('leave');
});

io.on('play', function(data) {
   playTrack(data);
});

io.on('users', function(data) {
    
    users = data;

    participants.innerHTML = '';

    if(data) {
        for(user in data) {
            var curUser= data[user];
            var parElement = document.createElement("div");
            parElement.className = "participant";
            if (curUser.images.length>0) {
                parElement.style.background = 'URL('+curUser.images[0].url+')';
            } else {
                var userElement = document.createElement("i");
                userElement.className = "fa fa-user";
                parElement.appendChild(userElement);
            }
            parElement.setAttribute("title",curUser.display_name ? curUser.display_name : curUser.id);
            participants.appendChild(parElement);

        }
    } else {
        // Should really not happen
    }
    
    var clearFixElement = document.createElement("div");
    clearFixElement.className = "clearfix";
    participants.appendChild(clearFixElement);

}),

io.on('message', function(data) {

    // Update stack
    messages.push(data);
    if (messages.length>15) {
        messages.shift();
    }

    historyContainer.innerHTML = '';

    // Update interface
    for (var idx=messages.length-1;idx>=0;idx--) {
        var curMessage = messages[idx];
        var curUser = curMessage.user;

        // Create .message container
        var msgElement = document.createElement("div");
        msgElement.className="msg_wrapper"

        // Create participant image
        var parElement = document.createElement("div");
        parElement.className = "msg_participant";
        if (curUser.images.length>0) {
            parElement.style.background = 'URL('+curUser.images[0].url+')';
        } else {
            var userElement = document.createElement("i");
            userElement.className = "fa fa-user";
            parElement.appendChild(userElement);
        }
        parElement.setAttribute("title",curUser.display_name ? curUser.display_name : curUser.id);
        msgElement.appendChild(parElement);

        var msgContentElement = document.createElement("div");
        msgContentElement.className = "msg_content";
        msgContentElement.innerHTML = curMessage.message;
        msgElement.appendChild(msgContentElement);

        var clearFixElement = document.createElement("div");
        clearFixElement.className = "clearfix";
        msgElement.appendChild(clearFixElement);
    
        historyContainer.appendChild(msgElement);

    }

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
            vuElement.className = "vote fa fa-thumbs-up mouseover link";
            vuElement.data = JSON.stringify(curTrack);
            vuElement.addEventListener('click', voteUpTrack);

            var vdElement = document.createElement("i");
            vdElement.className = "vote fa fa-thumbs-down mouseover link";
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

try_again.addEventListener('click', function() {
    window.location.href="/";
});

io.on('joined', function(data) {
    // data == room name
    // Set room name
    roomName.innerHTML = data;

    // Reset now playing
    npArtist.innerHTML = '';
    npName.innerHTML = 'Waiting for first vote';
    npAlbum.innerHTML = 'Queue empty';
    npAlbumArt.style.backgroundImage = "none";
    npDuration.innerHTML = '';
    nowPlaying = undefined;

    showRoom();
});
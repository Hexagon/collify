var queueBox = document.getElementById('queuebox'),

    npArtist = document.getElementById('np_artist'),
    npName = document.getElementById('np_name'),
    npAlbum = document.getElementById('np_album'),
    npAlbumArt = document.getElementById('np_albumart'),
    npDuration = document.getElementById('np_duration'),
    npElapsed = document.getElementById('np_elapsed'),

    participants = document.getElementById('participants'),

    searchStringElm = document.getElementById('searchstring'),
    message = document.getElementById('message'),
    historyContainer = document.getElementById('history'),

    roomName = document.getElementById('room_name'),

    leave = document.getElementById('leave'),

    popup_warning = document.getElementById('popup_warning'),
    try_again = document.getElementById('try_again'),

    resultbox = document.getElementById('resultbox'),

    npPbElapsed = document.getElementById('np_pb_elapsed'),
    npPbLeft = document.getElementById('np_pb_left'),

    searchString,
    users = {},
    messages = [],

    lastSearch = '',

    nowPlaying;

var refresh = function () {
    if (nowPlaying) {
        var elapsed_ms = (Date.now() - nowPlaying.started) > nowPlaying.track.duration_ms ? nowPlaying.track.duration_ms : (Date.now() - nowPlaying.started),
            elapsed_str = new Date(elapsed_ms).toLocaleTimeString(),
            prc = Math.round(elapsed_ms / nowPlaying.track.duration_ms*100);

        // Forcibly limit range to 0-100
        prc = (prc > 100) ? 100 : ((prc < 0) ? 0 : prc);

        npPbElapsed.style.width=prc + "%";
        npPbLeft.style.width=100-prc + "%";

        // Shorten elapsed time from HH:MM:SS to MM:SS and update UI
        npElapsed.innerHTML = elapsed_str.substr(elapsed_str.length-5);
    }
    setTimeout(refresh,1000);
};

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
};

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
        curTrack;

    resultbox.innerHTML = '';

    if(obj = JSON.parse(response)) {
        if(obj.tracks && obj.tracks.items.length > 0 ) {
            for(track in obj.tracks.items) {
                curTrack = obj.tracks.items[track];

                var newElm = document.createElement("div");
                newElm.id = curTrack.id;

                var vuElement = document.createElement("i");
                vuElement.className = "vote fa fa-plus-circle link mouseover ";
                vuElement.data = JSON.stringify(curTrack);
                vuElement.addEventListener('click', voteUpTrack);

                newElm.className = 'track searchresult';
                newElm.innerHTML = '<div class="tr_votes"> - </div>';
                newElm.innerHTML += '<div class="tr_albumart" style="background: URL('+curTrack.album.images[2].url+')"></div>';
                newElm.innerHTML += '<div class="tr_artist">'+curTrack.name+' - '+curTrack.artists[0].name+'</div>';

                newElm.appendChild(vuElement);

                var clearFixElement = document.createElement("div")
                clearFixElement.className = "clearfix";
                newElm.appendChild(clearFixElement);

                resultbox.appendChild(newElm);

            }
        } else {
            resultbox.innerHTML = 'No results for \''+lastSearch+'\'';
        }
    } else {
        resultbox.innerHTML = 'No results for \''+lastSearch+'\'';
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
        lastSearch = searchStringElm.value;
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
    messages = [];
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

    var clearFixElement = document.createElement("div")
    clearFixElement.className = "clearfix";
    participants.appendChild(clearFixElement);

}),

io.on('message', function(data) {

    // Update stack, allow at most 15 messages to be shown
    messages.push(data);
    if (messages.length>15) {
        messages.shift();
    }

    historyContainer.innerHTML = '';

    // Render all messages currently on the stack
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

        var msgParticipantName = document.createElement("div");
        msgParticipantName.className = "msg_participant_name";
        msgParticipantName.innerHTML = curUser.display_name ? curUser.display_name : curUser.id;
        msgElement.appendChild(msgParticipantName);

        var msgContentElement = document.createElement("div");
        msgContentElement.className = "msg_content msg_content_" + curMessage.type;
        msgContentElement.innerHTML = escapeHtml(curMessage.message);
        msgElement.appendChild(msgContentElement);

        var clearFixElement = document.createElement("div")
        clearFixElement.className = "clearfix";
        msgElement.appendChild(clearFixElement);
    
        historyContainer.appendChild(msgElement);

    }

});

io.on('tracks', function(data) {
    var obj,
        curTrack

    console.log(data);

    queuebox.innerHTML = '';

    if(data) {
        for(track in data) {
            curTrack = data[track];

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
            newElm.innerHTML += '<div class="tr_artist">'+curTrack.name+ ' - '+curTrack.artists[0].name+'</div>';
            if (curTrack.added) {
                console.log(curTrack.added.by);
                newElm.innerHTML += '<div class="tr_by">Added by '+(curTrack.added.by.display_name ? curTrack.added.by.display_name : curTrack.added.by.id)+'</div>';
            }
            
            newElm.insertBefore(vuElement,newElm.firstChild);
            newElm.insertBefore(vdElement,newElm.firstChild);

            var clearFixElement = document.createElement("div")
            clearFixElement.className = "clearfix";
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
    roomName.innerHTML = escapeHtml(data);

    // Reset now playing
    npArtist.innerHTML = 'Queue empty';
    npName.innerHTML =  'Waiting for first vote';
    npAlbum.innerHTML = 'Welcome to #' + data;
    npAlbumArt.style.backgroundImage = "none";
    npDuration.innerHTML = '';
    npElapsed.innerHTML = '';
    npPbElapsed.style.width=0 + "%";
    npPbLeft.style.width=100 + "%";
    nowPlaying = undefined;

    // Reset search result
    resultbox.innerHTML = '';

    // Use UI defaults
    hidePopupBlockerWarning();refresh();
    
    showRoom();
});

document.addEventListener('keyup',function(e) {
    if (e.keyCode == 27) {
        resultbox.innerHTML = '';
    }
});
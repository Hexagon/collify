var alias = document.getElementById('alias'),
    auth = document.getElementById('auth');

alias.addEventListener('focus', function() {
    alias.value='';
});

alias.addEventListener('keypress', function(evt) {
    // Check format
    if (evt.keyCode===13) {
        var parts = alias.value.split('@');
        if (parts.length == 2) {
            var username = parts[0].trim(),
                room = parts[1].trim();
            if (username.length>0 && room.length>0) {

                io.emit('auth',{username:username,room:room});
                return true;

            } 
        }
        // Color failed
        auth.className='row failed';
    }
});

io.on('denied', function() {
    showLogin();
});

io.on('accepted', function() {
    showRoom();
});
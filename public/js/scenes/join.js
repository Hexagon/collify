var alias = document.getElementById('alias'),
    join = document.getElementById('join');

alias.addEventListener('focus', function() {
    alias.value='';
});

alias.addEventListener('keypress', function(evt) {
    // Check format
    if (evt.keyCode===13) {
        var room = alias.value;
        if (room.length>0) {
            io.emit('join',{room:room});
            return true;
        } else {
            // Color failed
            join.className='row failed';
        }
    }
});

io.on('joined', function(data) {
    // data == room name
    showRoom();
});
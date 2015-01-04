var alias = document.getElementById('alias'),
    join = document.getElementById('join'),
    rooms = document.getElementById('rooms');

alias.addEventListener('focus', function() {
    alias.value='';
});

alias.addEventListener('keypress', function(evt) {
    // Check format
    if (evt.keyCode===13) {
        var room = alias.value.toLowerCase();
        if (room.length>0) {
            io.emit('ready',{room:room});
            return true;
        } else {
            // Color failed
            join.className='row failed';
        }
    }
});

io.on('toplist', function(data) {
    rooms.innerHTML = '';
    for(i in data) {
        var newElm = document.createElement("div");
        newElm.className = 'room_tag mouseover link left';
        newElm.innerHTML = '#' + data[i].name;
        newElm.data = data[i].name;
        newElm.addEventListener('click', function(e) {
            io.emit('ready',{room:e.target.data});
        });
        rooms.appendChild(newElm);
    }
    var clearFixElement = document.createElement("div");
    clearFixElement.className = "clearfix";
    rooms.appendChild(clearFixElement);
});
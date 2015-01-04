var auth = document.getElementById('auth'),
    authed = document.getElementById('authed');

auth.addEventListener('click', function(evt) {
    location.href="/login";
});

io.on('authenticated', function(data) {
    var name = data.display_name ? data.display_name : data.id;
    authed.innerHTML = 'Welcome, ' + name + '!';
    showJoin();
    io.emit('toplist');
});

io.on('denied', function() {
    showAuth();
});
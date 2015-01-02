var auth = document.getElementById('auth');

auth.addEventListener('click', function(evt) {
    location.href="/login";
});

io.on('authenticated', function(data) {
    console.log('Authenticated as', data);
    showJoin();
});

io.on('denied', function() {
    console.log('Authentication failed');
    showAuth();
});
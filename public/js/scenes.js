var sceneRoom = document.getElementById('scene_room'),
	sceneJoin = document.getElementById('scene_join'),
	sceneAuth = document.getElementById('scene_auth');

var hideAll = function () {
    sceneRoom.style.display = 'none';
    sceneJoin.style.display = 'none';
    sceneAuth.style.display = 'none';
};

var showAuth = function() {
	hideAll();
    sceneAuth.style.display = 'block';
};

var showJoin = function() {
    hideAll();
    sceneJoin.style.display = 'block';
};

var showRoom = function() {
	hideAll();
    sceneRoom.style.display = 'block';
};

// Show default scene
showAuth();

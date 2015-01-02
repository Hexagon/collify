var sceneRoom = document.getElementById('scene_room'),
	sceneLogin = document.getElementById('scene_login');

var showLogin = function() {
    sceneRoom.style.display = 'none';
    sceneLogin.style.display = 'block';
};

var showRoom = function() {
    sceneRoom.style.display = 'block';
    sceneLogin.style.display = 'none';
};

// Show default scene
showLogin();

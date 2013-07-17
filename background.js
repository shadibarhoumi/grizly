var startupTime = Date.now();
var currentUserRef = null;

var notify = function(snapshot) {
	var notification = webkitNotifications
			.createNotification(chrome.extension.getURL('one.png'), 'New link received!', "Sender: " +
				snapshot.val().sender + " Link: " + snapshot.val().link);
	    notification.show();
}

var addToHistory = function(snapshot) {
	// add link to link history
}

var listen = function(username) {
	// remove callbacks from currentUSerRef if it exists
	if (currentUserRef) {
		currentUserRef.off('child_added');
	}

	currentUserRef = new Firebase('https://grizly.firebaseio.com/users/' + username + '/links');
		
	// start listening
	currentUserRef.on('child_added', function(snapshot) {
		// add link to history
		addToHistory(snapshot);

		// notify user if link was sent after startup
		// (ie don't notify for existing links on startup)
		if (snapshot.val().createdAt > startupTime) {
			notify(snapshot);
		}
		
	});
}

// try to listen on startup if user is signed in
chrome.storage.sync.get('grizlyUsername', function(ret) {
	console.log('listening for', ret.grizlyUsername, 'on startup');
	if (ret.grizlyUsername) {
		listen(ret.grizlyUsername);
	}
});

// listen if popup sends a request with username meaning
// someone has signed up or logged in
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
  	console.log(request.username, 'has signed up or logged in, now im listening');
    if (request.username) {
		 	listen(request.username);
    }
});

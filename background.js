var startupTime = Date.now();
var currentUserRef = null;
var history = [];

// listen if popup sends a request with firebaseUsername meaning
// someone has signed up or logged in
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {

    if (request.action === 'LISTEN') {
	  	console.log('[BG]', request.firebaseUsername, 'has signed up or logged in, now im listening');
    	// listen for links sent to given firebaseUsername
	 	listen(request.firebaseUsername);
    } else if (request.action === 'GET HISTORY') {
    	sendResponse({history: history});
    }
});

var notify = function(snapshot) {
	// add random id to copy of snapshot value that we pass to the notification
	var data = snapshot.val();
	data.randomId = Math.floor(Math.random() * 100000).toString();
	var htmlNotification = webkitNotifications.createHTMLNotification(
		'notification.html#' + JSON.stringify(data)
	);
	htmlNotification.show();
}

var addToHistory = function(snapshot) {
	history.push(snapshot.val());
}

var listen = function(firebaseUsername) {
	// remove callbacks from currentUSerRef if it exists
	if (currentUserRef) {
		currentUserRef.off('child_added');
	}

	currentUserRef = new Firebase('https://grizly.firebaseio.com/users/' + firebaseUsername + '/links');
		
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
chrome.storage.sync.get('user', function(ret) {
	if (ret.user) {
		console.log('[BG]', 'listening for', ret.user.email, 'on startup');
		console.log('[BG]', 'his firebase username is:', ret.user.firebaseUsername);
		listen(ret.user.firebaseUsername);
	} else {
		console.log('[BG]', 'no ones logged in i guess i mean its not a big deal its really whatever it doesnt matter to me if nobody is using my app');
	}
});


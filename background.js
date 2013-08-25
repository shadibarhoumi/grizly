var loginTime = Date.now();
var userLinkRef;
var userFriendRef;
var googleAuth;
var history = [];
var friends = [];

// TODO: somehow unduplicate this between bg and popup!
var emailToFirebaseUsername = function(email) {
        email = email.replace(/@/g, 'AT');
        email = email.replace(/\./g, 'DOT');
        return email;
};

var notify = function(snapshot) {
	// add random id to copy of snapshot value that we pass to the notification
	var data = snapshot.val();
	data.randomId = Math.floor(Math.random() * 100000).toString();
	var htmlNotification = webkitNotifications.createHTMLNotification(
		'notification.html#' + JSON.stringify(data)
	);
	htmlNotification.show();
}

var addToHistory = function(snapshot) { history.push(snapshot.val()); }

var addToFriends = function(snapshot) { friends.push(snapshot.val()); }

var listen = function(firebaseUsername) {
	// remove callbacks from old references
	if (userLinkRef && userFriendRef) {
        userLinkRef.off('child_added');
        userFriendRef.off('child_added');
    }

	history.length = 0;  // clear history
    friends.length = 0; // clear friends
    console.log('history', history, 'friends', friends);

	userLinkRef = new Firebase('https://grizly.firebaseio.com/users/' + firebaseUsername + '/links');
	userLinkRef.on('child_added', function(snapshot) {
		// add link to history
		addToHistory(snapshot);
		// console.log('just recieved a link, heres the snapshot', snapshot);
		console.log('just received a link in listen, adding to hist!');
		// notify user if link was sent after startup
		// (ie don't notify for existing links on startup)
		// TODO: change startupTime to last login time!
		if (snapshot.val().createdAt > loginTime) {
			console.log('notifying user!');
			notify(snapshot);
		}
	});

    // listen for friends and add to list
    userFriendRef = new Firebase('https://grizly.firebaseio.com/users/' + firebaseUsername + '/friends');
    userFriendRef.on('child_added', function(snapshot) {
        addToFriends(snapshot);
    });
}

///////////////////////////////// RUN ON STARTUP ///////////////////////////////

// listen if popup sends a request with firebaseUsername meaning
// someone has signed up or logged in
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action === 'GET HISTORY') {
    	sendResponse({ history: history });
    } else if (request.action === 'GET FRIENDS') {
        sendResponse({ friends: friends });
    } else if (request.action === 'LOGOUT') {
        chrome.storage.sync.set({ user: null }); // clear username in localstorage
        googleAuth.clearAccessToken(); // clear google access token
        sendResponse({ message: 'SUCCESS' });
    } else if (request.action === 'AUTHENTICATE') {
        // create oauth object
        googleAuth = new OAuth2('google', {
            client_id: '394925537192.apps.googleusercontent.com',
            client_secret: '4bh05CW5FR5Q2CNANRbCPxuU',
            api_scope: 'https://www.googleapis.com/auth/userinfo.email'
        });

        // authenticate user
        googleAuth.authorize(function() {
            // We should now have googleAuth.getAccessToken() returning a valid token value for us 
            // Create an XMLHttpRequest to get the email address 
            var xhr = new XMLHttpRequest();
            xhr.open("GET","https://www.googleapis.com/oauth2/v1/userinfo", true);
            // Set the content & autherization 
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Authorization', "OAuth " + googleAuth.getAccessToken() );
            console.log('sending xhr!');
            xhr.send(null);

            xhr.onreadystatechange = function() {
                if( xhr.readyState === 4 && xhr.status === 200 ) {
                    console.log('XHR: Got the XHR that I wanted, here it is:', xhr);
                    var parseResult = JSON.parse(xhr.responseText);
                    // get email address 
                    var email = parseResult["email"];
                    // since username is going to be in firebase url, replace @ and . with AT and DOT
                    var firebaseUsername = emailToFirebaseUsername(email);
                    console.log('firebase username: ', firebaseUsername);
                    // store email in localStorage so user is signed in
                    console.log('writing user', firebaseUsername, 'to localstorage');
                    chrome.storage.sync.set({ user: {firebaseUsername: firebaseUsername, email: email} });

                    // start listening for links for this username
                    loginTime = Date.now();
                    listen(firebaseUsername);
                    console.log('authenticated, now listening to user:', firebaseUsername);

                    // tell popup that we successfully authenticated!
                    // also send back user's email for display in user view
                    sendResponse({message: 'SUCCESS', email: email, firebaseUsername: firebaseUsername});
                } else {
                    console.log('XHR: Got a different XHR than expected, here it is:', xhr);
                }
            };

          
        });
    }

    // The chrome.runtime.onMessage listener must return true if you want to send a response after the listener returns
    return true;
});


// try to listen on startup if user is signed in
chrome.storage.sync.get('user', function(ret) {
	if (ret.user) {
		console.log('[BG]', 'somebody is logged in! it is', ret.user.email);
		console.log('[BG]', 'his firebase username is:', ret.user.firebaseUsername);
		listen(ret.user.firebaseUsername);
	} else {
		console.log('[BG]', 'no ones logged in i guess i mean its not a big deal its really whatever it doesnt matter to me if nobody is using my app');
	}
});
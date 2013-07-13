// initialize db
console.log('running...');

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action == "signup") {
		var newUser = (new Firebase('https://grizly.firebaseio.com/users')).push();
		newUser.set(request.user);
      	var userId = newUser.path.m[1];
      	chrome.storage.sync.set({grizlyUser: { userId: userId, email: request.user.email } });
      	sendResponse({message: "Successfully signed up " + request.user.email, email: request.user.email});
    }
  });

// db.on('child_added', function(snapshot) {
// 	console.log('ADDED TO DB:', snapshot.val().link);
// 	// notify user with new link
// 	// var notification = webkitNotifications
// 	// 	.createNotification(chrome.extension.getURL('bear38.png'), 'New link received!', snapshot.val().link);
//  //    notification.show();
//  	console.log('child added:', snapshot);
// });
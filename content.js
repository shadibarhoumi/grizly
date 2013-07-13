$(function() {
	console.log('sending message from content script!');
	chrome.runtime.sendMessage({greeting: "hello"}, function(response) {
		console.log('now logging response');
	  console.log(response.farewell);
	});


	// chrome.runtime.onMessage.addListener(
 //  		function(request, sender, sendResponse) {
 //  			console.log("CONTENT SCRIPT GOT A LINK FROM BACKGROUND HOLY SHIT HERE IT IS: " + request.link);
	//   	});

});
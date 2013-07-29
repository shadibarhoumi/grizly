$(function() {
	var data = JSON.parse(document.URL.split('notification.html#')[1]);
	$('.title').text(data.title);
	$('.sender').text(data.sender);
	$('.link').text(data.link);
	$('#randomId').val(data.randomId);

	var currentRandomId = data.randomId;

	$('body').click(function(e) {
		// open new tab with link
		chrome.tabs.create({ url: data.link });
		// find current notification via randomId and close it!
		chrome.extension.getViews({type:"notification"}).forEach(function(win) {
			var notificationRandomId = win.document.getElementById('randomId').value;
			if (notificationRandomId === currentRandomId) {
				win.close();	
			}
		});
	});
});
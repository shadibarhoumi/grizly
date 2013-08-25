$(function() {
    // since username is going to be in firebase url, replace @ and . with AT and DOT
    var emailToFirebaseUsername = function(email) {
        email = email.replace(/@/g, 'AT');
        email = email.replace(/\./g, 'DOT');
        return email;
    };

    ///////// ON EXTENSION STARTUP //////
    var bg = chrome.extension.getBackgroundPage();
    var firebaseUsername = null;

    chrome.storage.sync.get('user', function(ret) {
        
        // if user exists
        if (ret.user) {
            var user = ret.user;
            // cache firebaseUsername for use in other functions
            firebaseUsername = user.firebaseUsername;
            // show user view
            bg.console.log('[POPUP]', 'current grizly user: ', ret.user.email);
            $('#signup').addClass('hidden');
            $('#user .current-user').text(user.email);
            $('#user').removeClass('hidden');

            // if signed in, display user view
            chrome.runtime.sendMessage({action: 'GET HISTORY'}, function(response) {
                // get history from background page and fill history list with it
                bg.console.log('filling history from background!');
                for (var i = 0; i < response.history.length; i++) {
                    var li = $('<li/>');
                    var a = $('<a/>').attr('href', response.history[i].link).html(response.history[i].link);
                    var text = 'Sender: ' + response.history[i].sender + ' ';
                    $('#user .history .list').prepend(li.append(text, a));
                }
            });

            // get friend list from background page and fill friends list
            chrome.runtime.sendMessage({ action: 'GET FRIENDS' }, function(response) {
                bg.console.log('filling friends from background');
                for (var i = 0; i < response.friends.length; i++) {
                    var friend = response.friends[i];
                    var button = $('<button/>').html(friend.emails.join(' & ')).addClass('friend');
                    // button.data('usernames', JSON.stringify(friend.usernames));
                    $('.friends .list').prepend(button);    
                }
            });

        } else {
            // nothing needs to be here since signup is shown by default
            bg.console.log('[POPUP]', 'no user logged in');
            // wait for user to click on log in with gmail
        }
    });
    
    ////// LOGIN WITH GOOGLE /////
    $('.google-login').click(function() {
        chrome.runtime.sendMessage({action: 'AUTHENTICATE'}, function(response) {
            if (response.message === 'SUCCESS') {
                bg.console.log('Successfully logged in as', response.email);
                 // show user view
                $('#signup').addClass('hidden');
                $('#user .current-user').text(response.email);
                $('#user').removeClass('hidden');
                // get history from firebase on login because it hasn't been loaded into background array yet!
                linkRef = new Firebase('https://grizly.firebaseio.com/users/' + response.firebaseUsername + '/links');
                linkRef.on('value', function(snapshot) {
                    bg.console.log('filling history on value');
                    $('#user .history .list').html(''); // clear out history list
                    for (var linkObject in snapshot.val()) { // fill hist list with links
                        var li = $('<li/>');
                        var a = $('<a/>').attr('href', snapshot.val()[linkObject].link).html(snapshot.val()[linkObject].link);
                        var text = 'Sender: ' + snapshot.val()[linkObject].sender + ' ';
                        $('#user .history .list').prepend(li.append(text, a));
                    }
                });
                // fill friends list
                friendsRef = new Firebase('https://grizly.firebaseio.com/users/' + response.firebaseUsername + '/friends');
                friendsRef.on('value', function(snapshot) {
                    bg.console.log('filling friends on value');
                    $('#user .friends .list').html(''); // clear out friends list
                    for (var friendObject in snapshot.val()) {
                        var friend = snapshot.val()[friendObject];
                        // fill friends view with friend send buttons
                        var button = $('<button/>').html(friend.emails.join(' & ')).addClass('friend');
                        // button.append($('<input/>').attr('type', 'hidden').html(friendId));
                        $('.friends .list').prepend(button);
                    }
                });
            } else {
                bg.console.log('holy shit something went wrong!');
            }
        });
    });

    ////////////// USER VIEW //////////////////
    $('.add-friend').click(function() {
        $('.add-friend-form').removeClass('hidden');
    });

    $('.add-friend-submit').click(function() {
        var emails = $('.friend-names').val().split(/[ ,]+/);
        // map emails to firebase usernames
        var firebaseUsernames = emails.map(emailToFirebaseUsername);
        var friends = new Firebase('https://grizly.firebaseio.com/users/' + firebaseUsername + '/friends');
        // each friend bucket has an array of firebase usernames and emails
        var friendId = friends.push({firebaseUsernames: firebaseUsernames, emails: emails});
        $('.friend-names').val('');
        $('.add-friend-form').addClass('hidden');
        console.log('not prepending an additional button!');
        // var button = $('<button/>').html(usernames.join(' & ')).addClass('friend');
        // button.append($('<input/>').attr('type', 'hidden').html(friendId));
        // bg.console.log('new friend', $('.friend'));
        // $('.friends .list').prepend(button);
    });

    $('.friends .list').click(function(e) {
        bg.console.log('clicked friend link ahh! text:', $(e.target).text());
        // TODO: account for multiple recipients
        var recipientEmail = $(e.target).text();
        // TODO: check that recipient exists
        var recipientDataRef = new Firebase('https://grizly.firebaseio.com/users/' + emailToFirebaseUsername(recipientEmail) + '/links');

        chrome.tabs.getSelected(null, function(tab) {
            var currentUrl = tab.url;
            var title = tab.title;
            bg.console.log('current tab data', tab);
            chrome.storage.sync.get('user', function(ret) {
                recipientDataRef.push({sender: ret.user.email,
                                       title: title,
                                       link: currentUrl,
                                       createdAt: Date.now()});
                bg.console.log('[POPUP]', 'pushing link', link, 'to', recipientDataRef);
            });
        });
    });

    // logout event
    $('.logout-button').click(function() {
        bg.console.log('[POPUP]: user logging out, setting firebase username to null');
        chrome.runtime.sendMessage({action: 'LOGOUT'}, function(response) {
            if (response.message === 'SUCCESS') {
                bg.console.log('back in foreground, just logged out!');
                $('#user').addClass('hidden');
                $('#signup .error').text('');
                $('#signup .username').val('');
                $('#signup').removeClass('hidden');
            }
        });
    });

});
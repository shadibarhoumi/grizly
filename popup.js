$(function() {
    // since username is going to be in firebase url, replace @ and . with AT and DOT
    var emailToFirebaseUsername = function(email) {
        email = email.replace(/@/g, 'AT');
        email = email.replace(/\./g, 'DOT');
        return email;
    };

    // on open
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
                for (var i = 0; i < response.history.length; i++) {
                    var li = $('<li/>');
                    var a = $('<a/>').attr('href', response.history[i].link).html(response.history[i].link);
                    var text = 'Sender: ' + response.history[i].sender + ' ';
                    $('#user .history .list').prepend(li.append(text, a));
                }
            });

            // fill friends list
            userFriendsRef = new Firebase('https://grizly.firebaseio.com/users/' + user.firebaseUsername + '/friends');
            userFriendsRef.on('child_added', function(snapshot) {
                var friend = snapshot.val();
                bg.console.log('friend', friend);
                // fill friends view with friend send buttons
                var button = $('<button/>').html(friend.emails.join(' & ')).addClass('friend');
                // button.append($('<input/>').attr('type', 'hidden').html(friendId));
                $('.friends .list').prepend(button);
            });
        } else {
            // nothing needs to be here since signup is shown by default
            bg.console.log('[POPUP]', 'no user logged in');
            // wait for user to click on log in with gmail
        }
    });
    
    $('.google-login').click(function() {
        bg.console.log('clicked google login button');
        // create oauth object
        var googleAuth = new OAuth2('google', {
            client_id: '394925537192.apps.googleusercontent.com',
            client_secret: '4bh05CW5FR5Q2CNANRbCPxuU',
            api_scope: 'https://www.googleapis.com/auth/userinfo.email'
        });

        // authenticate user
        googleAuth.authorize(function() {
            // We should now have googleAuth.getAccessToken() returning a valid token value for us 
            // Create an XMLHttpRequest to get the email address 
            var xhr = new XMLHttpRequest();

            xhr.onreadystatechange = function() {
                bg.console.log('xhr came back!'); 
                if( xhr.readyState == 4 && xhr.status === 200 ) {
                    var parseResult = JSON.parse(xhr.responseText);
                    bg.console.log('email');
                    // get email address 
                    var email = parseResult["email"];
                    // since username is going to be in firebase url, replace @ and . with AT and DOT
                    var firebaseUsername = emailToFirebaseUsername(email);
                    bg.console.log('firebase username: ', firebaseUsername);
                    // store email in localStorage so user is signed in
                    bg.console.log('wrote user', firebaseUsername, 'to localstorage');
                    chrome.storage.sync.set({ user: {firebaseUsername: firebaseUsername, email: email} });

                    // tell background to listen for links for this username
                    chrome.runtime.sendMessage({action: 'LISTEN', firebaseUsername: firebaseUsername}, function(response) {
                        bg.console.log('[POPUP]', response.message);
                    });

                    // show user view
                    $('#signup .username').val(''); // TODO remove
                    $('#signup').addClass('hidden');
                    $('#user .current-user').text(email);
                    $('#user').removeClass('hidden');
                }
            };

            xhr.open("GET","https://www.googleapis.com/oauth2/v1/userinfo", true);
            // Set the content & autherization 
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Authorization', "OAuth " + googleAuth.getAccessToken() );
            bg.console.log('sending xhr!');
            xhr.send(null);
        });
    });

    // events
    $('#signup-button').click(function() {
        // grab username and password
        var username = $('#signup .username').val();
        var password = $('#signup .password').val();
        var newUser = new Firebase('https://grizly.firebaseio.com/users/' + username);
        // check that username isn't taken
        newUser.once('value', function(snapshot) {
            // if snapshot is null, name is available
            if (snapshot.val() === null) {
                // insert into firebase w/unique username as key
                newUser.set({password: password, links: []});
                // store username in chrome
                chrome.storage.sync.set({firebaseUsername: username});

                // tell background to listen for links for this username
                chrome.runtime.sendMessage({action: 'LISTEN', username: username}, function(response) {
                    bg.console.log('[POPUP]', response.message);
                });

                // clear username
                $('#signup .username').val('');
                $('#signup').addClass('hidden');
                $('#user .current-user').text(username);
                $('#user').removeClass('hidden');
            } else {
                $('#signup .error').text('Username ' + username + ' is already taken.');
            }
            // clear out password field after every click
            $('.password').val('');
        });

    });

    $('#login-button').click(function() {
        var username = $('#login .username').val();
        var password = $('#login .password').val();
        var userPassword = new Firebase('https://grizly.firebaseio.com/users/' + username + '/password');

         userPassword.once('value', function(snapshot) {
            if (snapshot.val() === password) {
                // store username in chrome
                chrome.storage.sync.set({firebaseUsername: username});

                // tell background to listen for links for this username
                chrome.runtime.sendMessage({username: username}, function(response) {
                    bg.console.log('[POPUP]', response.message);
                });

                // clear username
                $('#login .username').val('');
                $('#login').addClass('hidden');
                $('#user .current-user').text(username);
                $('#user').removeClass('hidden');
            } else {
                $('#login .error').text('Incorrect username and/or password.');
            }
            // clear out password field after every click
            $('.password').val('');
        });
    });

    $('a#login-link').click(function() {
        $('#signup').addClass('hidden');
        $('#user').addClass('hidden');

        $('#login .error').text('');
        $('#login .username').val('');
        $('#login').removeClass('hidden');
    });

    $('a#signup-link').click(function() {
        $('#user').addClass('hidden');
        $('#login').addClass('hidden');

        $('#signup .error').text('');
        $('#signup .username').val('');
        $('#signup').removeClass('hidden');
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
                recipientDataRef.push({sender: ret.user.firebaseUsername,
                                       title: title,
                                       link: currentUrl,
                                       createdAt: Date.now()});
                bg.console.log('[POPUP]', 'pushing link', link, 'to', recipientDataRef);
            });
        });
    });

    $('.logout-button').click(function() {
        // set username to null
        chrome.storage.sync.set({'firebaseUsername': null});
        $('#user').addClass('hidden');
        $('#signup .error').text('');
        $('#signup .username').val('');
        $('#signup').removeClass('hidden');
    });
});
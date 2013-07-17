$(function() {
    // on open
    var bg = chrome.extension.getBackgroundPage();

    chrome.storage.sync.get('grizlyUsername', function(ret) {
        bg.console.log('current grizly user: ', ret.grizlyUsername);

        if (ret.grizlyUsername) {
            $('#signup').addClass('hidden');
            $('#user #current-user').text(ret.grizlyUsername);
            $('#user').removeClass('hidden');
        } else {
            // nothing needs to be here since signup is shown by default
            bg.console.log('no user logged in');
        }
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
                chrome.storage.sync.set({grizlyUsername: username});

                // tell background to listen for links for this username
                chrome.runtime.sendMessage({username: username}, function(response) {
                    bg.console.log(response.message);
                });

                // clear username
                $('#signup .username').val('');
                $('#signup').addClass('hidden');
                $('#user #current-user').text(username);
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
                chrome.storage.sync.set({grizlyUsername: username});

                // tell background to listen for links for this username
                chrome.runtime.sendMessage({username: username}, function(response) {
                    bg.console.log(response.message);
                });

                // clear username
                $('#login .username').val('');
                $('#login').addClass('hidden');
                $('#user #current-user').text(username);
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

    $('#logout').click(function() {
        // set username to null
        chrome.storage.sync.set({'grizlyUsername': null});
        $('#user').addClass('hidden');

        $('#signup .error').text('');
        $('#signup .username').val('');
        $('#signup').removeClass('hidden');
    });

    $('.submit').click(function() {
        var recipient = $('.send .recipient').val();
        var link = $('.send .link').val();
        // TODO: check that recipient exists        
        var reciever = new Firebase('https://grizly.firebaseio.com/users/' + recipient + '/links');
        bg.console.log('pushing to firebase!');
        chrome.storage.sync.get('grizlyUsername', function(ret) {
            reciever.push({sender: ret.grizlyUsername, link: link, createdAt: Date.now()});
            bg.console.log('pushing link', link, 'to', reciever);
        });
    });

});
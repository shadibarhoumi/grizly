$(function() {
    // on open
    var bg = chrome.extension.getBackgroundPage();

    chrome.storage.sync.get('grizlyUser', function(ret) {
        bg.console.log('current grizly user: ', ret.grizlyUser.userId);

        if (ret.grizlyUser.userId) {
            bg.console.log('current logged in email is:', ret.grizlyUser.email);

            $('#signup').addClass('hidden');
            $('#user #current-user').text(ret.grizlyUser.email);
            $('#user').removeClass('hidden');
        } else {
            // nothing needs to be here since signup is shown by default
            bg.console.log('no user logged in');
        }
    });

    // events
    $('#signup-button').click(function() {
        var email = $('#signup .email').val();
        var password = $('#signup .password').val();
        // clear form
        $('.email').val('');
        $('.password').val('');

        // tell background to stick it into db
        chrome.runtime.sendMessage({action: 'signup',
                                    user: { email: email,
                                        password: password,
                                        joinedAt: new Date() } },
            function(response) {
                // successful sign up
                bg.console.log(response.message);
                $('#signup').addClass('hidden');
                $('#user #current-user').text(response.email);
                $('#user').removeClass('hidden');
        });
    });

    $('a#login-link').click(function() {
        $('#signup').addClass('hidden');
        $('#user').addClass('hidden');
        $('#login').removeClass('hidden');
    });

    $('a#signup-link').click(function() {
        $('#signup').removeClass('hidden');
        $('#user').addClass('hidden');
        $('#login').addClass('hidden'); 
    });

    $('#logout').click(function() {
        // set userId to null
        chrome.storage.sync.set({'grizlyUser': null});
        $('#signup').removeClass('hidden');
        $('#user').addClass('hidden');
    });

});
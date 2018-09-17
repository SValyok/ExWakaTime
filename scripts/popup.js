



var ExWakaTimePopup={

    config: {
        version: "0.0.1",
        authUrl: 'https://wakatime.com/oauth/token',
        currentUserApiUrl: 'https://wakatime.com/api/v1/users/current',

    },
    getUserInfo:function(){
        chrome.runtime.sendMessage({method: "getUserInfo",protect:'5541'}, function(response) {
            // console.log(response);
            // $("#options .debug").text(JSON.stringify(response));
            /**
             * Проверяем по единственным обязательным данным E-mail
             */
            if(response.email){
                $("#options .is_log_in").css("display","block");
                $("#options .not_log_in").css("display","none");

                $("#options .name").text(response.display_name);
                $("#options .nick").text("@"+response.username);
                $("#options .email").text(response.email);
            }else{
                $("#options .not_log_in").css("display","block");
                $("#options .is_log_in").css("display","none");
            }
        });
    },



}

ExWakaTimePopup.getUserInfo();



// Add a listener to resolve alarms
chrome.alarms.onAlarm.addListener(function (alarm) {
    // |alarm| can be undefined because onAlarm also gets called from
    // window.setTimeout on old chrome versions.
    if (alarm && alarm.name == 'heartbeatAlarm') {

        console.log('recording a heartbeat - alarm triggered');

        ExWakaTime.recordHeartbeat();
    }
});

// Create a new alarm for heartbeats.
chrome.alarms.create('heartbeatAlarm', {periodInMinutes: 2});

/**
 * Whenever a active tab is changed it records a heartbeat with that tab url.
 */
chrome.tabs.onActivated.addListener(function (activeInfo) {

    chrome.tabs.get(activeInfo.tabId, function (tab) {
        console.log('recording a heartbeat - active tab changed');

        ExWakaTime.recordHeartbeat();

    });

});

chrome.tabs.onUpdated.addListener(
    function ( tabId, changeInfo, tab )
    {
        if ( changeInfo.status === "complete" )
        {
            console.log('recording a heartbeat - page update');
            ExWakaTime.recordHeartbeat();
        }
    }
);


chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {


    if (message && message.method == 'reload' && sender.tab.title=="Extend WakaTime") {

        ExWakaTime.reloadRules();

    }
    if (message && message.method == 'reloadApiKey' && sender.tab.title=="Extend WakaTime") {

        ExWakaTime.reloadApiKey();

    }
    if (message && message.method == 'getUserInfo' && message.protect=="5541") {
        // console.log(ExWakaTime.userInfo);
        if(!ExWakaTime.disabled){
            sendResponse(ExWakaTime.userInfo) ;
        }else{
            sendResponse({}) ;
        }
    }
});

chrome.storage.sync.get(['rules'], function(result) {
    console.log('loading rules');

    try {
        // console.log(result);
        var rules=JSON.parse(result.rules);
        ExWakaTime.rules=rules;

    }catch($e ){
    }


});
chrome.storage.sync.get(['apiKey'], function(result) {
    // console.log(result);
    try {
        if(result.apiKey==''){
            ExWakaTime.disabled=true;
            ExWakaTime.userInfo={};
        }else{
            ExWakaTime.disabled=false;
            ExWakaTime.apiKey=result.apiKey;

            ExWakaTime.loadUserInfo();
        }
        // ExWakaTime.auth();
    }catch($e ){
    }


});
function in_array(needle, haystack) {
    for (var i = 0; i < haystack.length; i ++) {
        if (needle == haystack[i]) {
            return true;
        }
    }

    return false;
}
function getDomainFromUrl(url) {
    var parts = url.split('/');

    if(parts[2])return parts[0] + "//" + parts[2];
    else return parts[0];
}



// Holds currently open connections (ports) with devtools
// Uses tabId as index key.
var connections = {};

/**
 * This is in charge of detecting if devtools are opened or closed
 * and sending a heartbeat depending on that.
 */
chrome.runtime.onConnect.addListener(function (port) {

    if (port.name == "devtools-page") {

        // Listen to messages sent from the DevTools page
        port.onMessage.addListener(function (message, sender, sendResponse) {
            if (message.name == "init") {

                connections[message.tabId] = port;

                ExWakaTime.setTabsWithDevtoolsOpen(Object.keys(connections));

                ExWakaTime.recordHeartbeat();
            }
        });

        port.onDisconnect.addListener(function (port) {

            var tabs = Object.keys(connections);

            for (var i = 0, len = tabs.length; i < len; i ++) {
                if (connections[tabs[i]] == port) {
                    delete connections[tabs[i]];
                    break;
                }
            }

            ExWakaTime.setTabsWithDevtoolsOpen(Object.keys(connections));

            ExWakaTime.recordHeartbeat();
        });

    }
});




/*
 chrome.storage.sync.set({key: value}, function() {
          console.log('Value is set to ' + value);
        });

        chrome.storage.sync.get(['key'], function(result) {
          console.log('Value currently is ' + result.key);
        });
* */

var ExWakaTime={
    disabled:true,
    apiKey:'',
    tabsWithDevtoolsOpen: [],
    reloadRules:function(){

        chrome.storage.sync.get(['rules'], function(result) {
            console.log('loading rules');

            try {

                var rules=JSON.parse(result.rules);
                ExWakaTime.rules=rules;
                console.log(rules);

            }catch($e ){
            }

        });
    },
    reloadApiKey:function(){

        chrome.storage.sync.get(['apiKey'], function(result) {

            try {
                if(result.apiKey==''){
                    ExWakaTime.disabled=true;
                    ExWakaTime.userInfo={};
                }else{
                    ExWakaTime.disabled=false;
                    ExWakaTime.apiKey=result.apiKey;
                    console.log("Loading User Data");
                    ExWakaTime.loadUserInfo();
                }
            }catch($e ){
            }


        });
    },
    /**
     * Settter for tabsWithDevtoolsOpen
     *
     * @param tabs
     */
    setTabsWithDevtoolsOpen:function(tabs) {
        this.tabsWithDevtoolsOpen = tabs;
    },
    config:{
        version:"0.0.1",
        authUrl: 'https://wakatime.com/oauth/token',
        heartbeatApiUrl: 'https://wakatime.com/api/v1/users/current/heartbeats',
        // Url from which to detect if the user is logged in
        currentUserApiUrl: 'https://wakatime.com/api/v1/users/current',
        // The url to logout the user from wakatime
        logoutUserUrl: 'https://wakatime.com/logout',
        // Gets stats from the WakaTime API
        summariesApiUrl: 'https://wakatime.com/api/v1/users/current/summaries'
    },
    rules:[],
    userInfo:{},
    loadUserInfo:function(){
        $.ajax({
            url: this.config.currentUserApiUrl,
            type: 'get',
            data: {
                // access_token: this.apiKey
            },
            headers: {
                // Header_Name_One: 'Header Value One',   //If your header name has spaces or any other char not appropriate
                "Authorization": 'Bearer '+this.apiKey  //for object property name, use quoted notation shown in second
            },
            dataType: 'json',
            success: function (data) {
                ExWakaTime.userInfo=data.data;
                // console.info(data);
            },
            error: (xhr, status, err) => {
                ExWakaTime.userInfo={};
                // console.log(xhr);
                // console.log(status);
                // console.log(err);
            }
        });
    },
    recordHeartbeat:function(){
        if(ExWakaTime.disabled)return;
        // chrome.tabs.query({windowType: "devtools" }, (tabs)=>{
        //     console.log(tabs);
        // });
        chrome.idle.queryState(60, (newState) => {
            if (newState === 'active') {

                // Get current tab URL.
                chrome.tabs.query({active: true,
                    currentWindow: true}, (tabs) => {

                    if(tabs.length<=0) return;
                    var currentActiveTab = tabs[0];
                    var debug = false;

                    // If the current active tab has devtools open
                    // if (in_array(currentActiveTab.id, this.tabsWithDevtoolsOpen)) {
                    //     debug = true;
                    // }
                    if(debug){
                        console.log(currentActiveTab.url);
                        console.log(currentActiveTab.title);
                        console.log("Console.opened: "+debug);
                    }

                    var heartbeat = this.getHeartbeat(currentActiveTab.url);

                    if (heartbeat.url) {
                        this.sendHeartbeat(heartbeat, debug);
                    }
                    else {
                        // changeExtensionState('whitelisted');
                        if(debug) {
                            console.log(currentActiveTab.url + ' is not on a whitelist.');
                        }
                    }
                });

            }

        });
    },

    /**
     * Creates payload for the heartbeat and returns it as JSON.
     *
     * @param heartbeat
     * @param type
     * @param debug
     * @returns {*}
     * @private
     */
    _preparePayload:function(heartbeat, type, debug = false) {
        return JSON.stringify({
            entity: heartbeat.url,
            type: type,
            time:Math.floor(Date.now() / 1000),
            project: heartbeat.project || '<<LAST_PROJECT>>',
            // is_debugging: debug,
            category: debug==true?"debugging":"browsing",
            plugin: 'chrome-extend-wakatime/' + this.config.version
        });
    },

    /**
     * Sends AJAX request with payload to the heartbeat API as JSON.
     *
     * @param payload
     * @param method
     * @returns {*}
     */
    sendAjaxRequestToApi:function(payload, method = 'POST') {

        var deferredObject = $.Deferred();

        $.ajax({
            url: this.config.heartbeatApiUrl,
            dataType: 'json',
            contentType: 'application/json',
            method: method,
            data: payload,
            headers: {
                // Header_Name_One: 'Header Value One',   //If your header name has spaces or any other char not appropriate
                "Authorization": 'Bearer '+this.apiKey  //for object property name, use quoted notation shown in second
            },
            statusCode: {
                401: function () {
                    // changeExtensionState('notSignedIn');

                },
                201: function () {
                    // nothing to do here
                }
            },
            success: (response) => {
                deferredObject.resolve(this);
            },
            error: (xhr, status, err) => {
                console.error(this.config.heartbeatApiUrl, status, err.toString());
                deferredObject.resolve(this);
            }
        });

        return deferredObject.promise();
    },


    /**
     * Given the heartbeat and logging type it creates a payload and
     * sends an ajax post request to the API.
     *
     * @param heartbeat
     * @param debug
     */
    sendHeartbeat:function(heartbeat, debug) {
        var payload = null;
        heartbeat.url = heartbeat.url;
        payload = this._preparePayload(heartbeat, 'domain', debug);
        if(debug){
            console.log(payload);
        }
        this.sendAjaxRequestToApi(payload);

 /*


        this._getLoggingType().done((loggingType) => {
            // Get only the domain from the entity.
            // And send that in heartbeat
            if (loggingType == 'domain') {
                heartbeat.url = getDomainFromUrl(heartbeat.url);
                payload = this._preparePayload(heartbeat, 'domain', debug);
                console.log(payload);
                this.sendAjaxRequestToApi(payload);
            }
            // Send entity in heartbeat
            else if (loggingType == 'url') {
                payload = this._preparePayload(heartbeat, 'url', debug);
                console.log(payload);
                this.sendAjaxRequestToApi(payload);
            }
        });*/




    },
    getHeartbeat:function(url) {

                var r=this.rules;
                for (var i = 0; i < r.length; i ++) {
                    // Trim all lines from the list one by one
                    var cleanLine = r[i]['rule'].trim();

                    // If by any chance one line in the list is empty, ignore it
                    if (cleanLine === '') {
                        continue;
                    }
                    if (url.indexOf(cleanLine) > -1) {

                        var rp=new RegExp('https?://([^/]+)','g');
                        var _url=url.replace(rp,'');

                        return {
                            url:r[i]['project'],
                            real_url: url,
                            project: r[i]['project']
                        };
                    }
                    // If url contains the current line return object
                 /*   if (url.indexOf(cleanLine.split('@@')[0]) > -1) {
                        if (cleanLine.split('@@')[1]) {
                            return {
                                url: cleanLine.split('@@')[0],
                                project: cleanLine.split('@@')[1]
                            };
                        }
                        else {
                            return {
                                url: cleanLine.split('@@')[0],
                                project: null,
                            };
                        }
                    }*/
                }

                return {
                    url: null,
                    project: null,
                };
            }





};


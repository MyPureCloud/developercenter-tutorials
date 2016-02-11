(function () {
    var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/\r\n/g,"\n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}

    var tutorialIndex = 1;
    var languageConfig = {};
    var currentLanguage = "";
    var currentCodeUrl = "";
    var markerBegin= null;
    var markerEnd = null;

    function highlight(stepConfig){

        var start = parseInt(stepConfig.highlight.split('-')[0]);
        var end = parseInt(stepConfig.highlight.split('-')[1]);
        var editor = ace.edit("editor");

        setTimeout(function(){
        if(markerBegin){
            editor.getSession().removeMarker(markerBegin);
        }

        if(markerEnd){
            editor.getSession().removeMarker(markerEnd);
        }

        markerBegin = editor.session.addMarker(new aceRange(0,0,start - 1,0),"ace_blur","background");
        markerEnd = editor.session.addMarker(new aceRange(end,0,500,0),"ace_blur","background");

        },50);

        editor.gotoLine(start);
    }

    function showStep(step){
        $('.step').hide();
        $(".step:nth-child("+ step +")").show();
        $("#step-title").text($(".step:nth-child("+ step +")").data('title'));

        tutorialIndex = step;

        if(step === 1){
            $('#prev').prop('disabled', true);
        }else{
            $('#prev').prop('disabled', false);
        }

        if(step === languageConfig.steps.length){
            $('#next').prop('disabled', true);
        }else{
            $('#next').prop('disabled', false);
        }

        var index = step -1;
        var stepConfig = languageConfig.steps[index];

        fileUrl = stepConfig.file;

        if(fileUrl.indexOf(currentLanguage) == 0){
            var pathSeparator = "";

            if(window.location.pathname[window.location.pathname.length-1] != "/"){
                pathSeparator = "/";
            }

            fileUrl = window.location.pathname + pathSeparator + fileUrl; //HAML compile issue
        }

        $('#filename').text(fileUrl);

        var editor = ace.edit("editor");

        editor.setValue(Base64.decode(tutorial_files[stepConfig.file]));
        editor.setReadOnly(true);

        highlight(stepConfig);
        editor.session.setUseWorker(false)
    }

    function loadLanguages(){
        var language = window.location.hash.replace('#','');

        if(language === '' || config[language] == null){
            language = localStorage['tutorial_language'] || Object.keys(config)[0];
        }

        if(config[language] == null){
            language = Object.keys(config)[0];
        }

        var languageOptions = $("#languageSelect");
        $.each(config, function(key, value) {
            languageOptions.append($("<option />").val(key).text(value.displayName));
        });

        languageOptions.change(function(){
            localStorage['tutorial_language'] = this.value;
            selectLanguage(this.value);
        });

        selectLanguage(language);
    }

    function selectLanguage(language){

        window.tutorial = $(".tutorial").data("title") + "#" + language;

        if(history.pushState) {
            history.pushState(null, null, '#' + language);
        }
        else {
            location.hash = '#' + language;
        }

        $(".note").hide();
        $(".note-"+language).show();

        $("#languageSelect").val(language);

        currentLanguage = language;
        console.log("tutorial language: "  + language)
        languageConfig = config[language];

        var editor = ace.edit("editor");

        var aceLanguage = language;
        if(language.toLowerCase() === "nodejs"){
            aceLanguage = "javascript";
        }

        editor.getSession().setMode("ace/mode/" + aceLanguage);

        editor.setValue("");
        showStep(tutorialIndex);
    }

    $('body').ready(function(){

        $("#editor").height($('body').height()-250);

        window.document.title = $(".tutorial").data("title");

        $("#tutorial-title").text($(".tutorial").data("title"));

        var editor = ace.edit("editor");
        aceRange = ace.require('ace/range').Range;

        editor.setTheme("ace/theme/tomorrow_night_bright");
        editor.setOption("highlightActiveLine", false)
        editor.$blockScrolling = Infinity

        loadLanguages();

        $('#next').click(function(){
            showStep(tutorialIndex + 1);
        });

        $('#prev').click(function(){
            showStep(tutorialIndex - 1);
        });
    });
}());

(function () {
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

        if(currentCodeUrl != fileUrl){
            $.ajax({
                "url": fileUrl,
                dataType:'text'
            }).success(function (data, status, xhr) {
                currentCodeUrl = stepConfig.file;
                var editor = ace.edit("editor");

                editor.setValue(data);
                editor.setReadOnly(true);

                highlight(stepConfig);
                editor.session.setUseWorker(false)
            }).error(function(){
                console.error("error getting file")
            });
        }else{
            highlight(stepConfig);
        }
    }

    function loadLanguages(){
        var language = localStorage['tutorial_language'] || Object.keys(config)[0]

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

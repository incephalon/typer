function __log(e, data) {
    //console.log("\n" + e + " " + (data || ''));
}
;

var audio_context;
var voiceRecorder;
var blobs = {};
var voice_blob = null;

function startUserMedia(stream) {
    var input = audio_context.createMediaStreamSource(stream);
    __log('Media stream created.');

    input.connect(audio_context.destination);
    __log('Input connected to audio context destination.');

    voiceRecorder = new VoiceRecorder(input, {workerPath: "js/voice_record/voice-recorderWorker.js"});
    __log('Recorder initialised.');
}
;

function startVoiceRecording() {
    voiceRecorder && voiceRecorder.record();
    __log('Start voice recording...');
}
;

function stopVoiceRecording() {
    voiceRecorder && voiceRecorder.stop();
    __log('Stop voice recording.');

    // create WAV download link using audio data blob
    //createDownloadLink();

    makeVoicePlayerReady();
    voiceRecorder.clear();
}
;

function makeVoicePlayerReady() {
    voiceRecorder && voiceRecorder.exportWAV(function(blob) {
        var voicePlayer = document.getElementById("voice_player");
        var url = URL.createObjectURL(blob);
        voicePlayer.src = url;
        if (voice_flag == true) {
            voicePlayer.addEventListener("loadedmetadata", function(_event) {
                var duration = voicePlayer.duration;
                var SS = duration;
                var HH = Math.floor(SS / 3600);
                var MM = Math.floor((SS % 3600) / 60);
                var LSS = Math.floor(SS % 60);
                var formatted;
                if (HH == 0)
                    formatted = ((MM < 10) ? ("0" + MM) : MM) + ":" + ((LSS < 10) ? ("0" + LSS) : LSS);
                else
                    formatted = ((HH < 10) ? ("0" + HH) : HH) + ":" + ((MM < 10) ? ("0" + MM) : MM) + ":" + ((LSS < 10) ? ("0" + LSS) : LSS);
                $("#totalTime").text(formatted);
                $("#playTime").text("00:00");
                $("#play_process .bar").css("width", "0%");
                
                record_datas[cur_record]['duration'] = formatted;
                $(".record_list .selected .title").text(formatted);

            });
            
            $(voicePlayer).bind('timeupdate', function() {
                var SS = voicePlayer.currentTime;
                var HH = Math.floor(SS / 3600);
                var MM = Math.floor((SS % 3600) / 60);
                var LSS = Math.floor(SS % 60);
                var formatted;
                if (HH == 0)
                    formatted = ((MM < 10) ? ("0" + MM) : MM) + ":" + ((LSS < 10) ? ("0" + LSS) : LSS);
                else
                    formatted = ((HH < 10) ? ("0" + HH) : HH) + ":" + ((MM < 10) ? ("0" + MM) : MM) + ":" + ((LSS < 10) ? ("0" + LSS) : LSS);
                $("#playTime").text(formatted);
                var percent = voicePlayer.currentTime / voicePlayer.duration * 100;
                $("#play_process .bar").css("width", percent + "%");
            });
            $(voicePlayer).bind('ended', function() {
                $(".playBtn").prop("value", "Start");
                $(".playBtn").removeClass("disabled");
                $(".pauseBtn").addClass("disabled");
                $(".slowBtn").removeClass("disabled");
                $(".fastBtn").removeClass("disabled");
                $(".recordBtn").removeClass("disabled");
                $(".stopBtn").addClass("disabled");
                $(".record_list").removeClass("disabled");


                $(".playBtn").show();
                $(".pauseBtn").hide();
                $(".recordBtn").show();
                $(".stopBtn").hide();

                $("#clearBtn").removeClass("disabled");
                $("#convertBtn").removeClass("disabled");
                
                $("#play_process .bar").css("width", "100%");
                setTimeout(function() {
                    $("#playTime").text('00:00');
                    $("#play_process .bar").css("width", "0%");
                    drawing.clearCanvas();
                }, 1000);
            });
        }
        record_datas[cur_record]['voice'] = blob;
        voice_blob = blob;
    });
}

function createDownloadLink() {
    voiceRecorder && voiceRecorder.exportWAV(function(blob) {
        var url = URL.createObjectURL(blob);
        var li = document.createElement('li');
        var au = document.createElement('audio');
        var hf = document.createElement('a');
        var name = new Date().toISOString();
        /**/

        var uplink = document.createElement('button');
        uplink.innerHTML = "Upload";
        uplink.id = "id" + $.guid;
        blobs[uplink.id] = blob;
        /**/

        au.controls = true;
        au.src = url;
        hf.href = url;
        hf.download = name + '.wav';
        hf.innerHTML = hf.download;
        li.appendChild(au);
        li.appendChild(hf);
        li.appendChild(uplink);
        recordingslist.appendChild(li);

        $("#" + uplink.id, recordingslist).click(function() {
            var fd = new FormData();
            fd.append('fileName', this.id + '.wav');
            fd.append('data', blobs[this.id]);
            $.ajax({
                type: 'POST',
                url: 'Home/Save',
                data: fd,
                processData: false,
                contentType: false
            }).done(function(data) {
                console.log(data);
            });
        });

    });
}
;

$(document).ready(function() {

    try {
        // webkit shim
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
        window.URL = window.URL || window.webkitURL;

        audio_context = new AudioContext;
        __log('Audio context set up.');
        __log('navigator.getUserMedia ' + (navigator.getUserMedia ? 'available.' : 'not present!'));
    } catch (e) {
        alert('No web audio support in this browser!');
    }

    navigator.getUserMedia({audio: true}, startUserMedia, function(e) {
        __log('No live audio input: ' + e);
        voice_flag = false;
    });
});
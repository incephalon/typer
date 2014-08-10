function __log(e, data) {
    //console.log("\n" + e + " " + (data || ''));
};

var audio_context;
var voiceRecorder;
var blobs = {};


function startUserMedia(stream) {
    var input = audio_context.createMediaStreamSource(stream);
    __log('Media stream created.');

    input.connect(audio_context.destination);
    __log('Input connected to audio context destination.');

    voiceRecorder = new VoiceRecorder(input, { workerPath: "js/voice_record/voice-recorderWorker.js" });
    __log('Recorder initialised.');
};

function startVoiceRecording() {
    voiceRecorder && voiceRecorder.record();
    __log('Start voice recording...');
};

function stopVoiceRecording() {
    voiceRecorder && voiceRecorder.stop();
    __log('Stop voice recording.');

    // create WAV download link using audio data blob
    //createDownloadLink();

    makeVoicePlayerReady();

    voiceRecorder.clear();
};

function makeVoicePlayerReady() {
    voiceRecorder && voiceRecorder.exportWAV(function (blob) {
        var voicePlayer = document.getElementById("voice_player");
        var url = URL.createObjectURL(blob);
        voicePlayer.src = url;
    });
}

function createDownloadLink() {
    voiceRecorder && voiceRecorder.exportWAV(function (blob) {
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

        $("#" + uplink.id, recordingslist).click(function () {
            var fd = new FormData();
            fd.append('fileName', this.id + '.wav');
            fd.append('data', blobs[this.id]);
            $.ajax({
                type: 'POST',
                url: 'Home/Save',
                data: fd,
                processData: false,
                contentType: false
            }).done(function (data) {
                console.log(data);
            });
        });

    });
};

$(document).ready(function () {
    
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
    
        navigator.getUserMedia({ audio: true }, startUserMedia, function (e) {
            __log('No live audio input: ' + e);
        });
});
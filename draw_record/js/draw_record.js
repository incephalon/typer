$(document).ready(
        function()
        {

        });

startScript("canvas1");

function startScript(canvasId)
{
    var isRecording = false;
    playbackInterruptCommand = "";

    $(document).bind("ready", function()
    {
        $(".pauseBtn").hide();
        $(".stopBtn").hide();
        $(".stroke_selected").css("color", "blue");

        drawing = new RecordableDrawing(canvasId);
        drawing.setColor("#0000ff");


        $.fn.jPicker.defaults.images.clientPath = 'images/';
        var LiveCallbackElement = $('#Live'),
                LiveCallbackButton = $('#LiveButton');
        $('#brush_color').jPicker({window: {expandable: true}, color: {active: new $.jPicker.Color({ahex: '0000ffff'})}}, function(color, context)
        {
            var all = color.val('all');
            drawing.setColor("#" + all.hex);
            $(".stroke_selected").css("color", "#" + all.hex);
        }
        );

        var recordInterval = drawing.getRecordInterval();
        var minPlayInterval = recordInterval / 4;
        var maxPlayInterval = recordInterval * 4;

        $(".fastBtn").click(function() {
            var playinterval = drawing.getPlayInterval();
            playinterval -= 10;

            if (playinterval < minPlayInterval)
                playinterval = minPlayInterval;
            drawing.setPlayInterval(playinterval);
            document.getElementById("voice_player").playbackRate = recordInterval / playinterval;
        });

        $(".fastBtn").hover(function() {
            var playinterval = drawing.getPlayInterval();
            playinterval -= 10;

            if (playinterval < minPlayInterval)
                playinterval = minPlayInterval;

            var tmp = recordInterval / playinterval;
            $(".fastBtn").attr('title', 'Speed will be ' + tmp.toFixed(1) + 'x');
        });

        $(".slowBtn").click(function() {
            var playinterval = drawing.getPlayInterval();
            playinterval += 10;

            if (playinterval > maxPlayInterval)
                playinterval = maxPlayInterval;
            drawing.setPlayInterval(playinterval);
            document.getElementById("voice_player").playbackRate = recordInterval / playinterval;
        });

        $(".slowBtn").hover(function() {
            var playinterval = drawing.getPlayInterval();
            playinterval += 10;

            if (playinterval > maxPlayInterval)
                playinterval = maxPlayInterval;

            var tmp = recordInterval / playinterval;
            $(".slowBtn").attr('title', 'Speed will be ' + tmp.toFixed(1) + 'x');
        });

        $(".recordBtn").click(function() {
            $(".playBtn").addClass("disabled");
            $(".pauseBtn").addClass("disabled");
            $(".slowBtn").addClass("disabled");
            $(".fastBtn").addClass("disabled");
            $(".recordBtn").addClass("disabled");
            $(".stopBtn").removeClass("disabled");

            $(".playBtn").show();
            $(".pauseBtn").hide();
            $(".recordBtn").hide();
            $(".stopBtn").show();
            drawing.clearCanvas();
            startRecording();
            // start voice recording
            startVoiceRecording();
        });

        $(".stopBtn").click(function() {
            $(".playBtn").removeClass("disabled");
            $(".pauseBtn").addClass("disabled");
            $(".slowBtn").removeClass("disabled");
            $(".fastBtn").removeClass("disabled");
            $(".recordBtn").removeClass("disabled");
            $(".stopBtn").addClass("disabled");

            $(".playBtn").show();
            $(".pauseBtn").hide();
            $(".recordBtn").show();
            $(".stopBtn").hide();

            $(".playBtn").prop("value", "Start");
            $("#convertBtn").removeClass("disabled");
            stopRecording();
            //stop voice recording
            stopVoiceRecording();
        });

        $(".playBtn").click(function() {
            $(".playBtn").addClass("disabled");
            $(".pauseBtn").removeClass("disabled");
            $(".slowBtn").removeClass("disabled");
            $(".fastBtn").removeClass("disabled");
            $(".recordBtn").addClass("disabled");
            $(".stopBtn").addClass("disabled");

            $(".playBtn").hide();
            $(".pauseBtn").show();
            $(".recordBtn").show();
            $(".stopBtn").hide();

            $("#clearBtn").addClass("disabled");
            playRecordings();
            document.getElementById("voice_player").play();
        });

        function playRecordings()
        {
            if (drawing.recordings.length == 0)
            {
                alert("No recording to play");
                return;
            }
            var btnTxt = $(".playBtn").prop("value");
            if (btnTxt == 'Resume')
                resumePlayback();
            else
                document.getElementById("voice_player").playbackRate = 1.0;
                startPlayback();
        }

        $(".pauseBtn").click(function() {
            $(".playBtn").removeClass("disabled");
            $(".pauseBtn").addClass("disabled");
            $(".slowBtn").removeClass("disabled");
            $(".fastBtn").removeClass("disabled");
            $(".recordBtn").removeClass("disabled");
            $(".stopBtn").addClass("disabled");

            $(".playBtn").show();
            $(".pauseBtn").hide();
            $(".recordBtn").show();
            $(".stopBtn").hide();
            $(".playBtn").prop("value", "Resume");

            $("#clearBtn").removeClass("disabled");
            pausePlayback();
            document.getElementById("voice_player").pause();
        });


        $("#clearBtn").click(function() {
            drawing.clearCanvas();
        });

        $("#serializeBtn").click(function() {
            var serResult = serializeDrawing(drawing);
            if (serResult != null)
            {
                $("#serDataTxt").val(serResult);
                showSerializerDiv();
            } else
            {
                alert("Error serializing data");
            }
        });

        function showSerializerDiv(showSubmit)
        {
            $("#drawingDiv").hide();
            $("#canvasBtnsDiv").hide();
            $("#serializerDiv").show();
            if (showSubmit)
                $("#okBtn").show();
            else
                $("#okBtn").hide();
        }

        function hideSerializerDiv()
        {
            $("#drawingDiv").show();
            $("#canvasBtnsDiv").show();
            $("#serializerDiv").hide();
        }

        $("#deserializeBtn").click(function() {
            showSerializerDiv(true);
        });

        $("#cancelBtn").click(function() {
            hideSerializerDiv();
        });

        $("#okBtn").click(function() {
            var serTxt = $("#serDataTxt").val();
            var result = deserializeDrawing(serTxt);
            if (result == null)
                result = "Error : Unknown error in deserializing the data";
            if (result instanceof Array == false)
            {
                $("#serDataTxt").val(result.toString());
                showSerializerDiv(false);
                return;
            }
            else
            {
                //data is successfully deserialize
                drawing.recordings = result;
                //set drawing property of each recording
                for (var i = 0; i < result.length; i++)
                    result[i].drawing = drawing;
                hideSerializerDiv();
                playRecordings();
            }
        });

        $(".stroke").click(function() {
            $(".stroke_selected").removeClass("stroke_selected");
            $(this).addClass("stroke_selected");
            $(".stroke").css("color", "#cccccc");
            $(".stroke_selected").css("color", getPickedColor());
            var size = parseInt($(this).css("font-size")) * 0.8;
            drawing.setStokeSize(size);
        });

        var size = parseInt($(".stroke_selected").css("font-size")) * 0.8;
        if (size > 0)
            drawing.setStokeSize(size);
    });

    function stopRecording()
    {
        $("#clearBtn").removeClass("disabled");

        drawing.stopRecording();
        isRecording = false;
    }

    function startRecording()
    {
        $("#clearBtn").addClass("disabled");

        drawing.startRecording();
        isRecording = true;
        //set curent color
        var color = getPickedColor();
        var strokesize = parseInt($(".stroke_selected").css("font-size")) * 0.8;
        drawing.setColor(color);
        drawing.setStokeSize(strokesize);
    }

    function stopPlayback()
    {
        playbackInterruptCommand = "stop";
    }

    function getPickedColor() {
        return "#" + $("#brush_color")[0].color.active.val('hex');
    }

    function startPlayback()
    {
        var currColor = getPickedColor();
        var currStrokeSize = parseInt($(".stroke_selected").css("font-size")) * 0.8;

        drawing.playRecording(function() {
            //on playback start
            playbackInterruptCommand = "";
        }, function() {
            //on playback end
            $(".playBtn").prop("value", "Start");
            $(".playBtn").removeClass("disabled");
            $(".pauseBtn").addClass("disabled");
            $(".slowBtn").removeClass("disabled");
            $(".fastBtn").removeClass("disabled");
            $(".recordBtn").removeClass("disabled");
            $(".stopBtn").addClass("disabled");

            $(".playBtn").show();
            $(".pauseBtn").hide();
            $(".recordBtn").show();
            $(".stopBtn").hide();

            $("#clearBtn").removeClass("disabled");
            $("#playTime").text('00:00');

            if (currColor && currColor != "")
                drawing.setColor(currColor);
            if (currStrokeSize > 0)
                drawing.setStokeSize(currStrokeSize);
        }, function() {
            //on pause

        }, function() {
            //status callback

            return playbackInterruptCommand;
        });
    }

    function pausePlayback()
    {
        playbackInterruptCommand = "pause";
    }

    function resumePlayback()
    {
        playbackInterruptCommand = "resume";
        drawing.resumePlayback(function() {
        });
    }

    function pauseRecording()
    {
        drawing.pauseRecording();
    }

    function resumeRecording()
    {
        drawing.resumeRecording();
    }
}


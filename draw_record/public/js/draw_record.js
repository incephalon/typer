$(document).ready(
        function()
        {

        });

startScript("canvas1");

var record_datas = new Array();
var cur_record = 0;
var voice_blob = null;
var voice_flag = true;
var convert_flag = true;

function startScript(canvasId)
{
    var isRecording = false;
    playbackInterruptCommand = "";


    $(document).bind("ready", function()
    {
        $(".pauseBtn").hide();
        $(".stopBtn").hide();
        $(".stroke_selected").css("color", "blue");
        $(".record_list").addClass("disabled");

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

        var modal = $('#convertStatus');
        modal.on('hidden', function() {
            convert_flag = false;
            drawing.clearCanvas();
        })

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
            $(".record_list").addClass("disabled");

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
            cur_record = record_datas.length;
            var record_data = {draw: '',
                voice: null,
                voice_check: true,
                duration: '',
                record_time: '',
                draw_rec_total: 0
            };

            record_datas.push(record_data);

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

            $(".playBtn").prop("value", "Start");
            $("#convertBtn").removeClass("disabled");
            stopRecording();
            //stop voice recording
            var voice_check = true;

            try {
                stopVoiceRecording();
            } catch (e)
            {
                voice_check = false
            }

            $(".record_data").each(function() {
                $(this).removeClass("selected");
                $('.fa-folder-open-o', this)
                        .removeClass("fa-folder-open-o")
                        .addClass("fa-folder-o");
            });

            record_datas[cur_record] = {draw: serializeDrawing(drawing),
                voice: voice_blob,
                voice_check: voice_check,
                duration: $("#totalTime").text(),
                record_time: new Date(),
                draw_rec_total: drawing.recordings[0].recTotalTime
            };

            var time = new Date(record_datas[cur_record]['record_time']);

            var title = record_data['duration'];
            var showTxt = time.getHours() + ":" + time.getMinutes() + ":" + time.getMinutes();
            var volume_class = (voice_check) ? "fa-volume-up" : "fa-volume-off";
            var recent_record = "<div class='record_data selected' index='" + (record_datas.length - 1) + "' style='display:none;'>"
                    + "<a href='#' title='" + showTxt + "' id='loadBtn" + (record_datas.length - 1) + "'> <i class='fa fa-folder-open-o fa-fw' > </i>"
                    + "<i class='fa " + volume_class + " fa-fw'> </i>"
                    + "<div class='title'>" + title + "</div>"
                    + "</a>"
                    + "<a href='#' title='delete' id ='deleteBtn" + (record_datas.length - 1) + "'> <i class='fa fa-trash-o fa-fw' > </i></a>"
                    + "</div>";
            $(".record_list").prepend(recent_record);

            $("#deleteBtn" + (record_datas.length - 1)).click(function() {
                console.log("test");
                var parent = $(this).parent();
                var index = parent.attr("index");

                record_datas[index] = null;
                if (parent.hasClass("selected")) {
                    // init status for play.
                    $(".playBtn").addClass("disabled");
                    $(".pauseBtn").addClass("disabled");
                    $(".slowBtn").addClass("disabled");
                    $(".fastBtn").addClass("disabled");
                    $(".recordBtn").removeClass("disabled");
                    $(".stopBtn").addClass("disabled");

                    $(".playBtn").show();
                    $(".pauseBtn").hide();
                    $(".recordBtn").show();
                    $(".stopBtn").hide();

                    $(".playBtn").prop("value", "Start");
                    $("#convertBtn").addClass("disabled");
                }
                parent.hide("slow", function() {
                    $(this).remove();
                });

            });

            $("#loadBtn" + (record_datas.length - 1)).click(function() {
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
                drawing.clearCanvas();

                var parent = $(this).parent();
                $(".record_data").each(function() {
                    $(this).removeClass("selected");
                    $('.fa-folder-open-o', this)
                            .removeClass("fa-folder-open-o")
                            .addClass("fa-folder-o");
                });
                parent.addClass("selected");
                $('.fa-folder-o', parent[0])
                        .removeClass("fa-folder-o")
                        .addClass("fa-folder-open-o");

                var index = parent.attr("index");
                cur_record = index;
                var draw_data = record_datas[index]['draw'];
                var result = deserializeDrawing(draw_data);

                $("#totalTime").text(record_datas[index]['duration']);
                //data is successfully deserialize
                drawing.recordings = result;
                //set drawing property of each recording
                for (var i = 0; i < result.length; i++)
                    result[i].drawing = drawing;

                if (record_datas[index]['voice_check'] != false) {
                    var voicePlayer = document.getElementById("voice_player");
                    var url = URL.createObjectURL(record_datas[index]['voice']);
                    voicePlayer.src = url;
                }
            });

            $(".record_list .selected").show('slow');
        });

        $(".playBtn").click(function() {
            $(".playBtn").addClass("disabled");
            $(".pauseBtn").removeClass("disabled");
            $(".slowBtn").removeClass("disabled");
            $(".fastBtn").removeClass("disabled");
            $(".recordBtn").addClass("disabled");
            $(".stopBtn").addClass("disabled");
            $(".record_list").addClass("disabled");

            $(".playBtn").hide();
            $(".pauseBtn").show();
            $(".recordBtn").show();
            $(".stopBtn").hide();

            $("#clearBtn").addClass("disabled");
            $("#convertBtn").addClass("disabled");
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
                startPlayback();
            document.getElementById("voice_player").playbackRate = 1.0;
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
            $("#convertBtn").removeClass("disabled");
            $(".record_list").removeClass("disabled");
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

        $("#convertBtn").click(function() {
            convert_flag = true;
            $("#convertStatus .bar").css("width", "0%");
            modal.modal();
            var directory = "record_" + new Date(record_datas[cur_record]['record_time']).getTime();
            $.ajax({
                type: "POST",
                url: "upload/createdirectory",
                data: {
                    directory: directory
                },
                datatype: 'application/json; charset=utf-8',
                success: function(theRes) {
                    if (theRes == "success") {
                        if (convert_flag == false) {
                            return;
                        }
                        if (record_datas[cur_record]['voice_check'] == true) {
                            uploadAudio(directory, record_datas[cur_record]['voice']);
                        } else {
                            uploadImg(directory, true, 0);
                        }
                    }
                }
            });
        });

        function uploadImg(directory, isFirst, index) {
            if (isFirst == true) {
                drawing.readyforScreenShot();
            }

            html2canvas($("#canvas1")[0], {
                onrendered: function(canvas) {
                    $.ajax({
                        type: "POST",
                        url: "upload/image",
                        data: {
                            directory: directory,
                            index: index,
                            img: JSON.stringify(canvas.toDataURL()),
                            isLast: 'false'
                        },
                        datatype: 'application/json; charset=utf-8',
                        success: function(theRes) {
                            if (theRes == "success") {

                                if (convert_flag == false) {
                                    return;
                                }

                                var percent = 10 + ((index) / (record_datas[cur_record]['draw_rec_total'] / 100 + 1) * 85);
                                $("#convertStatus .bar").css("width", percent + "%");

                                var isLast = drawing.drawNextScreenShot(100);
                                if (isLast == false) {
                                    uploadImg(directory, false, index + 1);
                                } else {
                                    html2canvas($("#canvas1")[0], {
                                        onrendered: function(canvas) {
                                            $.ajax({
                                                type: "POST",
                                                url: "upload/image",
                                                data: {
                                                    directory: directory,
                                                    index: index,
                                                    img: JSON.stringify(canvas.toDataURL()),
                                                    isLast: 'true'
                                                },
                                                datatype: 'application/json; charset=utf-8',
                                                success: function(theRes) {
                                                    if (theRes == "success") {

                                                        if (convert_flag == false) {
                                                            return;
                                                        }

                                                        drawing.clearCanvas();
                                                        /*$.ajax({
                                                         type: "POST",
                                                         url: "upload/download",
                                                         data: {
                                                         directory: directory
                                                         },
                                                         datatype: 'application/json; charset=utf-8',
                                                         success: function(theRes) {
                                                         }
                                                         });*/
                                                        $("#convertStatus .bar").css("width", "100%");
                                                        setTimeout(function() {
                                                            if (convert_flag == false) {
                                                                return;
                                                            }
                                                            $("#convertStatus .bar").css("width", "100%");
                                                            $('<form action="/upload/download" method="POST">' +
                                                                    '<input type="hidden" name="directory" value="' + directory + '">' +
                                                                    '</form>').submit();
                                                            modal.modal('hide');
                                                        }, 5000);
                                                    }
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        }
                    });
                }
            });
        }

        function uploadAudio(directory, mp3Data) {
            var reader = new FileReader();
            reader.onload = function(event) {
                var dataUrl = event.target.result;
                var base64 = dataUrl.split(',')[1];
                var update = {
                    directory: directory,
                    blob: base64
                };

                $.ajax({
                    type: 'POST',
                    url: '/upload/audio',
                    data: JSON.stringify(update),
                    datatype: 'application/json; charset=utf-8',
                    processData: false,
                    contentType: false
                }).done(function(theRes) {
                    if (theRes == "success") {
                        uploadImg(directory, true, 0);
                    }
                });
            };
            reader.readAsDataURL(mp3Data);
        }

        var size = parseInt($(".stroke_selected").css("font-size")) * 0.8;
        if (size > 0)
            drawing.setStokeSize(size);
    });

    function stopRecording()
    {
        $("#clearBtn").removeClass("disabled");
        $("#convertBtn").removeClass("disabled");

        drawing.stopRecording();
        isRecording = false;
    }

    function startRecording()
    {
        $("#clearBtn").addClass("disabled");
        $("#convertBtn").addClass("disabled");

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
            if (voice_flag == false) {
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
            }

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


Podium = {};
Podium.keydown = function (el, k, eventtype) {
    var oEvent = document.createEvent('KeyboardEvent');

    // Chromium Hack
    Object.defineProperty(oEvent, 'keyCode', {
        get: function () {
            return this.keyCodeVal;
        }
    });
    Object.defineProperty(oEvent, 'which', {
        get: function () {
            return this.keyCodeVal;
        }
    });

    if (oEvent.initKeyboardEvent) {
        oEvent.initKeyboardEvent(eventtype, true, true, document.defaultView, false, false, false, false, k, k);
    } else {
        oEvent.initKeyEvent(eventtype, true, true, document.defaultView, false, false, false, false, k, 0);
    }

    oEvent.keyCodeVal = k;

    if (oEvent.keyCode !== k) {
        alert("keyCode mismatch " + oEvent.keyCode + "(" + oEvent.which + ")");
    }

    el.dispatchEvent(oEvent);
}

dojoConfig = { parseOnLoad: true };
require(["dojo/parser", "dijit/layout/ContentPane", "dijit/layout/BorderContainer"]);
var bc, cp1, cp2, cp3;
require([
    "dojo/_base/array",
    "dojo/aspect",
    "dojo/dom",
    "dojo/dom-style",
    "dojo/json",
    "dojo/on",
    "dojo/parser",
    "dijit/registry",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/form/FilteringSelect",
    "dojo/domReady!"
], function (array, aspect, dom, domStyle, json, on, parser, registry, BorderContainer, ContentPane, FilteringSelect) {

    parser.parse();
    var bc, bc2, spl, sp2;

    array.forEach(["items_coder1", "items_coder2"], function (containerId) {
        bc = registry.byId(containerId);
        spl = bc.getSplitter("top");

        aspect.after(spl, "_startDrag", function () {
            editor.resize();
        });
        aspect.after(spl, "_stopDrag", function (evt) {
            editor.resize();
        });
    });

    bc = registry.byId("topper");
    bc2 = registry.byId("topper2");
    spl = bc.getSplitter("right");
    sp2 = bc2.getSplitter("right");

    array.forEach(["right"], function (region) {
        var spl = bc.getSplitter(region);

        aspect.after(spl, "_startDrag", function () {
            editor.resize();
            $('#warningTooltip1').width($('#coder').width() - 5);
        });
        aspect.after(spl, "_stopDrag", function (evt) {
            editor.resize();
            $('#warningTooltip1').width($('#coder').width() - 5);
        });
        aspect.after(sp2, "_startDrag", function () {
            editor2.resize();
            $('#warningTooltip2').width($('#coder').width() - 5);
        });
        aspect.after(sp2, "_stopDrag", function (evt) {
            editor2.resize();
            $('#warningTooltip2').width($('#coder').width() - 5);
        });
    })

    bc = registry.byId("borderContainer2");
    spl = bc.getSplitter("top");

    aspect.after(spl, "_startDrag", function () {
        editor.resize();
        editor2.resize();
    });
    aspect.after(spl, "_stopDrag", function (evt) {
        editor.resize();
        editor2.resize();
    });
});

var editor = ace.edit("code");
editor.setTheme("ace/theme/textmate");
editor.getSession().setMode("ace/mode/html");
editor.setOptions({
    enableBasicAutocompletion: true
});
//    editor.container.addEventListener("keydown", htmlKeyDownHandler);
//    editor.container.addEventListener("keypress", htmlKeyPressHandler);
//    editor.container.addEventListener("keyup", htmlKeyUpHandler);

/* Ace Editor does not fire 'keydown' event. So jQuery is being used for it. */
$("#code").children("textarea").keydown(htmlKeyDownHandler);
$("#code").children("textarea").keypress(htmlKeyPressHandler);
$("#code").children("textarea").keyup(htmlKeyUpHandler);

editor.focus();

editor2 = ace.edit("code2");
editor2.setTheme("ace/theme/textmate");
editor2.getSession().setMode("ace/mode/html");

function insertContent(content) {
    var tmpText = editor.getValue();
    tmpText = content + "\n" + tmpText;
    editor.setValue(tmpText);
    editor.moveCursorTo(1, 0);
    tmpText = editor2.getValue();
    tmpText = content + "\n" + tmpText;
    editor2.setValue(tmpText);
    editor2.moveCursorTo(1, 0);
}

function insertContentForRecord(content) {
    var tmpText = editor.getValue();
    tmpText = content + "\n" + tmpText;
    editor.setValue(tmpText);
    editor.moveCursorTo(1, 0);
}

$(document).ready(function () {
    $("#librarySel").bind("change", function (evt) {
        var selectedValue = $(evt.target).val();
        if (selectedValue) {
            insertContent(selectedValue);
            if (isRecording) {
                insertContentsToRecord.push(selectedValue);
            }
        }
    });


    // call Playback constructor to set initial values
    // can play record from localStorage if it exists (one last record)
    Playback.init();
});

$('.warningTooltip').hide();

var RECORDING_INTERVAL = 20;
var playingInterval = 20;
var tmpText;
var timeout;
var tCount = 0;
var timeValues = new Array();
var isPlaying = false;
var isFinished = false;
var isRecording = false;
var bStop = 0;
var speed = 1;
var recordingTimerId = 0;
var recordingIndex = 0;
var playingTimerId = 0;
var playingIndex = 0;
var isBusyPlaying = false;
var bPassedKeyDownAndBeforeKeyPress = false;

/* Variables for queue of recording values */
var keyCodesToRecord = new Array();
var mouseEventsToRecord = new Array();      // Set 5 as fixed size
var insertContentsToRecord = new Array();
var clipBoardsToRecord = null;
var keyStartSelection = null;

/* Variables for handling mouse events on progress bar */
var bProgressBarMouseDowned = false;
var isBusySeeking = false;

var isMouseDownOnEditor = false;

var Playback = {
    startTime: {},
    endTime: {},
    recordTime: {},
    /* 'recordedData'
    **
    ** We will save keyboard and mouse events every 20 milliseconds into 'recordedData'.
    **
    ** Structure of recordedData is as follows;
       recordedData = [
            0: {
                "codetype": "html" (or "css", "js"),
                "key": {
                    "cursor_row": Number,
                    "cursor_column": Number,
                    "asciiCode": 100
                    "functionKeyInfo": {
                        "keyCode": 95,
                        "altKey": false,
                        "ctrlKey": false,
                        "shiftKey": true
                    }
                },
                "mouse": [
                    0: "mousemove | mouseup | mousemove_with_selection",
                    1: 323  (pageX)
                    2: 108  (pageY)
                    3: Number (column of start cursor)
                    4: Number (row of start cursor)
                    5: Number (column of end cursor)
                    6: Number (row of end cursor)
                ]
            },
            1: {
            }
        ];
    **
    ** css and js are not yet implemented for now.
    */
    recordedData: {},
    recorderJsonData: {},
    isSavedRecord: true,
    initialData: {},
    CurrentRecordId: null,

    /* 'initialData'
**
** We save some data when clicking 'Record' button for initial status of editor.
** 
** Structure of initialData is as follows;
   initialData = {
        "html": {
            "initialText": (String),
            "caretPos": {
                "row": (Number),
                "column": (Number)
            },
            "selectionRange": {
                "start": {
                    "row": (Number),
                    "column": (Number)
                },
                "end": {
                    "row": (Number),
                    "column": (Number)
                }
            }
        },
        "css": {
        },
        "js": {
        }
    };
*/
    init: function (htmlEditorId) {

        var cursorPosition = editor.getCursorPosition();
        var selectionRange = editor.getSelectionRange();
        this.initialData = {
            "html": {
                "initialText": editor.getValue(),
                "caretPos": { "row": cursorPosition.row, "column": cursorPosition.column },
                "selectionRange": {
                    "start": { "row": selectionRange.start.row, "column": selectionRange.start.column },
                    "end": { "row": selectionRange.end.row, "column": selectionRange.end.column }
                }
            }
        };

        this.recordedData = new Array();
        keyCodesToRecord.length = 0;
        mouseEventsToRecord.length = 0;
        insertContentsToRecord.length = 0;
        recordingIndex = 0;

        var data = JSON.parse(localStorage.getItem("Playback.Data"));
        if (data != null) {
            this.isSavedRecord = false;
            this.CurrentRecordId = null;

            //            console.log('data.initialData ' + data.initialData);
            //            console.log('data.recordedData ' + data.recordedData);

            Playback.restoredInitialData = JSON.parse(data.initialData);
            Playback.restoredRecordedData = JSON.parse(data.recordedData);
            Playback.recordTime = JSON.parse(data.recordTime);
            // TODO concat blocks
            Playback.initialData = JSON.parse(data.initialData);
            Playback.recordedData = JSON.parse(data.recordedData);
        }
    },

    changeValueCallback: function (recordedItem) {
        /* Process Key */
        if (recordedItem.key != null) {
            handleKeyForHTML(recordedItem.key, recordedItem.clip);
        }

        /* Process Mouse */
        if (recordedItem.mouse != null) {
            handleMouseForHTML(recordedItem.mouse);
        }

        /* Process insertContent */
        if (recordedItem.content != null) {
            handleContentForHTML(recordedItem.content);
        }

        updatePreview('preview', editor.getValue());
    },

    getTimeDuration: function () {
        return this.endTime - this.startTime;
    },

    getRecorderJsonData: function () {
        return JSON.stringify({
            initialData: JSON.stringify(Playback.initialData),
            recordedData: JSON.stringify(Playback.recordedData),
            recordTime: JSON.stringify(Playback.recordTime),
            recordName: Playback.recordName
        });
    },

    clearLocalStorage: function () {
        localStorage.removeItem('Playback.Data');
    },

    saveLocalStorage: function () {
        return localStorage.setItem('Playback.Data', this.getRecorderJsonData());
    },

    getLocalStorage: function () {
        return localStorage.getItem('Playback.Data');
    }
};

function handleKeyForHTML(keyInfo, clipInfo) {
    setSelectionOnEditor(editor, keyInfo.cursor_row, keyInfo.cursor_column, keyInfo.cursor_row, keyInfo.cursor_column);
    if (keyInfo.asciiCode != null) {
        switch (keyInfo.asciiCode) {
            case 13:            // enter
                editor.insert("\n");
                break;
            default:
                editor.insert(String.fromCharCode(keyInfo.asciiCode));
                break;
        }
    } else if (keyInfo.functionKeyInfo != null) {
        switch (keyInfo.functionKeyInfo.keyCode) {
            case 8:         // Backspace
                editor.remove("left");
                editor.clearSelection();
                break;
            case 33:        // Page Up
                editor.gotoPageUp();
                break;
            case 34:        // Page Down
                editor.gotoPageDown();
                break;
            case 35:        // End
                editor.navigateLineEnd();
                break;
            case 36:        // Home
                editor.navigateLineStart();
                break;
            case 37:        // Left arrow
                editor.navigateLeft(1);
                break;
            case 38:        // Up arrow
                editor.navigateUp(1);
                break;
            case 39:        // Right arrow
                editor.navigateRight(1);
                break;
            case 40:        // Down arrow
                editor.navigateDown(1);
                break;
            case 46:        // Delete
                editor.remove("right");
                editor.clearSelection();
                break;
            case 86:         // Ctrl+V paste
                if (keyInfo.functionKeyInfo.ctrlKey == true)
                    editor.insert(clipInfo.copyText);
                break;
            case 88:         // Ctrl+X cut
                if (keyInfo.functionKeyInfo.ctrlKey == true)
                    editor.remove();
                break;
            default:
                console.log(keyInfo.functionKeyInfo.keyCode);
                break;
        }
        if (keyInfo.functionKeyInfo.shiftKey == true) {
            switch (keyInfo.functionKeyInfo.keyCode) {
                case 16:        // Shift Key
                case 33:        // Page Up
                case 34:        // Page Down
                case 35:        // End
                case 36:        // Home
                case 37:        // Left arrow
                case 38:        // Up arrow
                case 39:        // Right arrow
                case 40:        // Down arrow
                    if (keyStartSelection == null)
                        keyStartSelection = {
                            "row": keyInfo.functionKeyInfo.cursor_row,
                            "column": keyInfo.functionKeyInfo.cursor_column
                        };
                    setSelectionOnEditor(editor, keyStartSelection.row, keyStartSelection.column, keyInfo.functionKeyInfo.cursor_row, keyInfo.functionKeyInfo.cursor_column);
                    break;
                default:
                    console.log(keyInfo.functionKeyInfo.keyCode);
                    setSelectionOnEditor(editor, keyInfo.functionKeyInfo.cursor_row, keyInfo.functionKeyInfo.cursor_column, keyInfo.functionKeyInfo.cursor_row, keyInfo.functionKeyInfo.cursor_column);
                    break;
            }
        } else {
            keyStartSelection = null;
        }

    }
}

function handleMouseForHTML(mouseInfo) {
    if (mouseInfo[0] == "mousemove") {
        $("#mouse_cursor").offset({ left: mouseInfo[1] - 5, top: mouseInfo[2] - 10 }).show();
    } else if (mouseInfo[0] == "mouseup") {
        $("#mouse_cursor").offset({ left: mouseInfo[1] - 5, top: mouseInfo[2] - 10 }).show();
        setSelectionOnEditor(
            editor,
            Number(mouseInfo[3]),
            Number(mouseInfo[4]),
            Number(mouseInfo[5]),
            Number(mouseInfo[6]));
        keyStartSelection = {
            "row": mouseInfo[3],
            "column": mouseInfo[4]
        };
    } else if (mouseInfo[0] == "mousemove_with_selection") {
        $("#mouse_cursor").offset({ left: mouseInfo[1] - 5, top: mouseInfo[2] - 10 }).show();
        setSelectionOnEditor(
            editor,
            Number(mouseInfo[3]),
            Number(mouseInfo[4]),
            Number(mouseInfo[5]),
            Number(mouseInfo[6]));
    }
}

function handleContentForHTML(content) {
    insertContentForRecord(content);
}

function setSelectionOnEditor(editor, start_row, start_column, end_row, end_column) {
    if (start_row == null || start_column == null || end_row == null || end_column == null)
        return;

    editor.clearSelection();
    editor.getSession().selection.setSelectionRange(
                        {
                            start: {
                                row: start_row,
                                column: start_column
                            },
                            end: {
                                row: end_row,
                                column: end_column
                            }
                        },
                        false);
}

function updatePreview(preview, lastObj) {
    var previewFrame = document.getElementById(preview);
    var preview = previewFrame.contentDocument || previewFrame.contentWindow.document;
    preview.open();
    preview.write(lastObj);
    preview.close();
    $(window).scrollTop(0);
}

function playingTimerHandler() {
    if (isBusyPlaying == false) {
        isBusyPlaying = true;
        if (playingIndex < Playback.restoredRecordedData.length) {

            Playback.changeValueCallback(Playback.restoredRecordedData[playingIndex]);
            playingTimerId = setTimeout(playingTimerHandler, playingInterval);
            playingIndex++;

            var trackPercent = (playingIndex * 100) / Playback.restoredRecordedData.length;

            setProgressbarPercent(trackPercent);

        } else {

            $("#playstop").attr('class', 'fa fa-play fa-fw');
            isPlaying = false;
            isFinished = true;
            clearTimeout(playingTimerId);
            $("#mouse_cursor").hide();
        }
        isBusyPlaying = false;
    }
    var playTime = playingIndex / Playback.restoredRecordedData.length * Playback.recordTime;
    var SS = playTime / 1000;
    var HH = Math.floor(SS / 3600);
    var MM = Math.floor((SS % 3600) / 60);
    var LSS = Math.floor(SS % 60);
    var formatted;
    if (HH == 0)
        formatted = ((MM < 10) ? ("0" + MM) : MM) + ":" + ((LSS < 10) ? ("0" + LSS) : LSS);
    else
        formatted = ((HH < 10) ? ("0" + HH) : HH) + ":" + ((MM < 10) ? ("0" + MM) : MM) + ":" + ((LSS < 10) ? ("0" + LSS) : LSS);
    $("#playTime").text(formatted);

}

function setProgressbarPercent(trackPercent) {
    $("#playing_progressbar").css("width", trackPercent + "%");
}

function setInitialData(editor, restoredInitialData) {
    editor.setValue(restoredInitialData.html.initialText);
    editor.clearSelection();
    editor.moveCursorTo(Number(restoredInitialData.html.caretPos.row),
                        Number(restoredInitialData.html.caretPos.column));
}

function start() {
    $("#playstop").attr('class', 'fa fa-pause fa-fw');

    if (isFinished == true) {
        playingIndex = 0;
        isFinished = false;
        playingInterval = RECORDING_INTERVAL;
    }
    if (playingIndex == 0) {
        var data = JSON.parse(Playback.getLocalStorage());
        if (data) {
            console.log('---> get record from localStorage');
            doStartRecord({ InitialData: data.initialData, RecordedData: data.recordedData, RecordTime: data.recordTime });
        } else {
            console.log('---> get record from cloud');
            doGetRecord(Playback.CurrentRecordId, doStartRecord);
        }
    }
}

function doStartRecord(responseData) {
    if (isFinished == true) {
        playingInterval = RECORDING_INTERVAL;
    }
    Playback.restoredInitialData = JSON.parse(responseData.InitialData);
    Playback.restoredRecordedData = JSON.parse(responseData.RecordedData);
    Playback.recordTime = JSON.parse(responseData.RecordTime);

    var SS = Playback.recordTime / 1000,
        HH = Math.floor(SS / 3600),
        MM = Math.floor((SS % 3600) / 60),
        LSS = Math.floor(SS % 60),
        formatted;

    if (HH == 0) {
        formatted = ((MM < 10) ? ("0" + MM) : MM) + ":" + ((LSS < 10) ? ("0" + LSS) : LSS);
    } else {
        formatted = ((HH < 10) ? ("0" + HH) : HH) + ":" + ((MM < 10) ? ("0" + MM) : MM) + ":" + ((LSS < 10) ? ("0" + LSS) : LSS);
    }
    $("#totalTime").text(" / " + formatted);
    setInitialData(editor, Playback.restoredInitialData);

    editor.focus();
    playingTimerId = setTimeout(playingTimerHandler, playingInterval);
    // start voice playing
    document.getElementById("voice_player").play();
    isPlaying = true;
}

function pause() {
    $("#playstop").attr('class', 'fa fa-play fa-fw');
    if (playingTimerId != 0) {
        clearTimeout(playingTimerId);
        playingTimerId = 0;
        $("#mouse_cursor").hide();

        // pause voice playing
        document.getElementById("voice_player").pause();

        isPlaying = false;
    }
}

function seekToPercent(trackPercent) {
    if (isBusySeeking == false) {
        isBusySeeking = true;
        var voice_player = document.getElementById("voice_player")

        /* Stop playing timer */
        clearTimeout(playingTimerId);
        voice_player.pause();

        var seekedPlayingIndex = Playback.restoredRecordedData.length * (trackPercent / 100);
        seekedPlayingIndex = Math.floor(seekedPlayingIndex);

        /* Build status for position of 'seekedPlayingIndex' */
        setInitialData(editor, Playback.restoredInitialData);
        for (var i = 0; i < seekedPlayingIndex; i++) {
            Playback.changeValueCallback(Playback.restoredRecordedData[i])
        }

        /* Seek tracking index to position */
        playingIndex = seekedPlayingIndex;
        setProgressbarPercent(trackPercent);

        isFinished = false;

        /* Seek voice player */
        var seekedTime = voice_player.startTime + Math.floor(voice_player.duration * (trackPercent / 100));
        //        voice_player.currentTime = seekedTime;

        isBusySeeking = false;
        if (isPlaying) {
            start();
        } else {
            pause();
        }
    }
}

function recordingTimerHandler() {
    var keyInfo = null;
    var clipInfo = null;

    if (keyCodesToRecord.length > 0) {
        keyInfo = keyCodesToRecord.shift();
        if (keyInfo.functionKeyInfo != null && keyInfo.functionKeyInfo.ctrlKey == true && keyInfo.functionKeyInfo.keyCode == 86)
            clipInfo = clipBoardsToRecord;
    }
    var mouseInfo = null;
    if (mouseEventsToRecord.length > 0) {
        mouseInfo = mouseEventsToRecord.shift();
    }

    var contentInfo = null;
    if (insertContentsToRecord.length > 0) {
        contentInfo = insertContentsToRecord.shift();
    }
    var recordingInfo = {
        "codetype": "html",
        "key": keyInfo,
        "mouse": mouseInfo,
        "clip": clipInfo,
        "content": contentInfo
    };

    Playback.recordedData.push(recordingInfo);
    var currentTime = new Date();
    var diff = currentTime - Playback.startTime;
    var SS = diff / 1000;
    var HH = Math.floor(SS / 3600);
    var MM = Math.floor((SS % 3600) / 60);
    var LSS = Math.floor(SS % 60);
    var formatted;
    if (HH == 0)
        formatted = ((MM < 10) ? ("0" + MM) : MM) + ":" + ((LSS < 10) ? ("0" + LSS) : LSS);
    else
        formatted = ((HH < 10) ? ("0" + HH) : HH) + ":" + ((MM < 10) ? ("0" + MM) : MM) + ":" + ((LSS < 10) ? ("0" + LSS) : LSS);
    $("#playTime").text(formatted);
    $("#totalTime").text('');

    recordingIndex++;
}

function htmlKeyDownHandler(e) {
    if (isRecording) {
        var keyInfo = {
            "asciiCode": null,
            "functionKeyInfo": {
                "cursor_row": editor.getCursorPosition().row,
                "cursor_column": editor.getCursorPosition().column,
                "keyCode": e.keyCode,
                "altKey": e.altKey,
                "ctrlKey": e.ctrlKey,
                "shiftKey": e.shiftKey
            }
        };
        keyCodesToRecord.push(keyInfo);
        bPassedKeyDownAndBeforeKeyPress = true;
    }
}

function htmlKeyPressHandler(e) {
    if (isRecording) {
        if (bPassedKeyDownAndBeforeKeyPress == true) {    // i.e this is character key
            keyCodesToRecord.pop();
            bPassedKeyDownAndBeforeKeyPress = false;
        }

        var asciiCode = e.which || e.keyCode;
        var keyInfo = {
            "cursor_row": editor.getCursorPosition().row,
            "cursor_column": editor.getCursorPosition().column,
            "asciiCode": asciiCode,
            "functionKeyInfo": null
        };
        keyCodesToRecord.push(keyInfo);
    }
}

function htmlKeyUpHandler(e) {
    // No need to handle 'keyup' event

    //console.log("keyup: " + e.keyCode);
}

editor.on("mousedown", function (e) {
    if (isRecording) {
        isMouseDownOnEditor = true;
    }
});

editor.on("mousemove", function (e) {
    if (isRecording && isMouseDownOnEditor) {
        var selectionRange = editor.getSelectionRange();

        var eventInfo = [
            "mousemove_with_selection",
            e.pageX,
            e.pageY,
            selectionRange.start.row,
            selectionRange.start.column,
            selectionRange.end.row,
            selectionRange.end.column
        ];
        mouseEventsToRecord.push(eventInfo);
    }
});

editor.on("mouseup", function (e) {
    if (isRecording) {
        isMouseDownOnEditor = false;

        var selectionRange = editor.getSelectionRange();

        var eventInfo = [
            "mouseup",
            e.pageX,
            e.pageY,
            selectionRange.start.row,
            selectionRange.start.column,
            selectionRange.end.row,
            selectionRange.end.column
        ];

        mouseEventsToRecord.push(eventInfo);
    }
});

editor.on("paste", function (paste) {
    if (isRecording) {
        var clipInfo = {
            "copyText": paste
        }

        clipBoardsToRecord = clipInfo;
    }
});

$(document).mousemove(function (e) {
    if (isRecording) {
        var eventInfo = ["mousemove", e.pageX, e.pageY];
        if (mouseEventsToRecord.length >= 5) {
            var indexOfMouseMove = 0;
            var canPop = false;
            for (indexOfMouseMove = 0; indexOfMouseMove < mouseEventsToRecord.length; indexOfMouseMove++) {
                if (mouseEventsToRecord[indexOfMouseMove][0] == "mousemove") {
                    canPop = true;
                    break;
                }
            }
            if (canPop == true && indexOfMouseMove < mouseEventsToRecord.length) {
                mouseEventsToRecord.splice(indexOfMouseMove, 1);
            }
        }
        mouseEventsToRecord.push(eventInfo);
    } else {
        if (bProgressBarMouseDowned) {
            var maxValue = $("#playing_progressbar_container").width();
            var trackValue = e.pageX - $("#playing_progressbar_container").offset().left;
            var trackPercent = (trackValue * 100) / maxValue;

            if (trackPercent < 0) { trackPercent = 0; }
            if (trackPercent > 100) { trackPercent = 100; }

            seekToPercent(trackPercent);
        }
    }
});

$(document).mouseup(function (e) {
    if (bProgressBarMouseDowned == true) {
        bProgressBarMouseDowned = false;
    }
});

function splashHide() {
    setTimeout(function () { $("#loadingOverlay").fadeOut(); }, 1500); // waits one second before fadeout.
    editor.resize();
    editor2.resize();
}

$("#morefast").click(function () {
    playingInterval -= 5;
    if (playingInterval <= 0) { playingInterval = 1; }
});

$("#morefast").hover(function () {
    var tmp = playingInterval - 5;
    if (tmp <= 0) { tmp = 1; }
    var tmp = RECORDING_INTERVAL / tmp;
    $("#morefast").attr('title', 'Speed will be ' + tmp.toFixed(1) + 'x');
});

$("#moreslowly").click(function () {
    playingInterval += 5;
    if (playingInterval > 60) { playingInterval = 60; }
});

$("#moreslowly").hover(function () {
    var tmp = playingInterval + 5;
    if (tmp > 60) { tmp = 60; }
    var tmp = RECORDING_INTERVAL / tmp;
    $("#moreslowly").attr('title', 'Speed will be ' + tmp.toFixed(1) + 'x');
});

$("#StartStopRecord").hover(function () {
    var iClass = $(this).attr('class');
    if (iClass == 'fa fa-circle fa-fw') {
        $(this).attr('title', 'Start recording');
    } else {
        $(this).attr('title', 'Stop recording');
    }
});

$("#playstop").click(function () {
    var iClass = $("#playstop").attr('class');
    if (iClass == 'fa fa-play fa-fw') {
        start();
    } else {
        pause();
    }
});

editor.getSession().on('change', function (e) {
    // e.type, etc
    var tmpText = editor.getValue();

    var htmlIndex = tmpText.indexOf("<html");
    if (htmlIndex < 0)
        htmlIndex = tmpText.indexOf("<HTML");

    if (htmlIndex >= 0)
        $('#warningTooltip1').show();
    else
        $('#warningTooltip1').hide();

    $('.warningTooltip').width($('#coder').width() - 5);
    updatePreview('preview', tmpText);
});

editor2.getSession().on('change', function (e) {
    // e.type, etc
    var tmpText = editor2.getValue();
    var htmlIndex = tmpText.indexOf("<html");
    if (htmlIndex < 0)
        htmlIndex = tmpText.indexOf("<HTML");

    if (htmlIndex >= 0)
        $('#warningTooltip2').show();
    else
        $('#warningTooltip2').hide();

    $('.warningTooltip').width($('#coder').width() - 5);
    updatePreview('preview2', tmpText);
});

$("#playing_progressbar_container").mousedown(function (e) {
    var maxValue = $(this).width();
    var trackValue = e.pageX - $(this).offset().left;
    var trackPercent = (trackValue * 100) / maxValue;

    seekToPercent(trackPercent);
    bProgressBarMouseDowned = true;
});

$("#playing_progressbar_container").mousemove(function (e) {
    // need to handle mousemove event on $(document).mousemove
});

$("#playing_progressbar_container").mouseup(function (e) {
    // need to handle mouseup event on $(document).mouseup
});


////////////////////////////////////////
// Refactoring /////////////////////////
////////////////////////////////////////

//
// handlers
//
$("#SaveRecord").click(function () {
    saveRecord();
});
$('#RecordName').keypress(function (e) {
    if (e.which == 13) {
        saveRecord();
    }
});

$("#cancelSaveRecord").click(function () {
    Playback.recordName = $('#RecordName').val();
});

$("#selectRecord").click(function () {
    selectRecordToPlay();
});
$('.records-list').keypress(function (e) {
    if (e.which == 13) {
        selectRecordToPlay();
        doCloseRecordsListModal();
    }
});

$('.save-current-record').click(function () {
    if (Playback.isSavedRecord) {
        alert("There are no records to save");
        return;
    }
    doOpenRecordDetailsModal();
});

$('.show-records').click(function () {
    doGetRecordsList();
    doOpenRecordsListModal();
});

$("#StartStopRecord").click(function () {
    console.log('--> StartStopRecord');

    var iClass = $(this).attr('class');
    if (iClass == 'fa fa-circle fa-fw') {
        console.log('----> start recording');

        $(this).removeClass().addClass('fa fa-square fa-fw');
        doStartRecording();
    } else {
        console.log('----> stop recording');

        $(this).removeClass().addClass('fa fa-circle fa-fw');
        doStopRecording();
        Playback.saveLocalStorage();
    }
});


//
// methods
//
function saveRecord() {
    if ($('#RecordDetailsForm').valid()) {
        Playback.recordName = $('#RecordName').val();
        doCheckExists(Playback.recordName, saveRecordHandler);
    }
}

function selectRecordToPlay() {
    if (!Playback.isSavedRecord && confirm("You didn't save record. Save record now?")) {
        doOpenRecordDetailsModal();
    } else {
        var id = $('.records-list input:checked').attr('id');
        Playback.CurrentRecordId = id;
        //Playback.isSavedRecord = true;
    }
}

function saveRecordHandler(isExistsRecord) {
    if (isExistsRecord) {
        if (confirm("Record with current name already exists. Do you want to rewrite record?")) {
            doSaveRecord(Playback.getRecorderJsonData());
            Playback.clearLocalStorage();
            Playback.isSavedRecord = true;
            doCloseRecordDetailsModal();
        }
    } else {
        doSaveRecord(Playback.getRecorderJsonData());
    }
}

function doStartRecording() {
    if (isPlaying) {
        pause();
    }
    Playback.clearLocalStorage();
    isRecording = true;
    Playback.init('code');
    editor.focus();
    recordingTimerId = setInterval(recordingTimerHandler, RECORDING_INTERVAL);
    Playback.startTime = new Date();
    // start voice record
    startVoiceRecording();
}

function doStopRecording() {
    Playback.isSavedRecord = false;
    Playback.endTime = new Date();
    Playback.recordTime = Playback.getTimeDuration();
    isRecording = false;
    isFinished = true;
    if (recordingTimerId != 0) {
        clearInterval(recordingTimerId);
    }
    stopVoiceRecording();
}

function doCloseRecordDetailsModal() {
    $('#RecordDetailsModal').modal('hide');
}

function doOpenRecordDetailsModal() {
    var validator = $('#RecordDetailsModal').validate();
    validator.resetForm();
    $('#RecordName').val("");
    $('#RecordDetailsModal').modal('show');
}

$('#RecordDetailsModal').on('shown.bs.modal', function () {
    $('#RecordName').focus();
});

function doOpenRecordsListModal() {
    var elem = $('.records-list input[id="' + Playback.CurrentRecordId + '"]');
    if (!elem.length) {
        elem = $('.records-list input:first');
    }
    $('#RecordListModal').modal('show');
    elem.attr('checked', true);
}
$('#RecordListModal').on('shown.bs.modal', function () {
    $('.records-list input:first').focus();
});

function doCloseRecordsListModal() {
    $('#RecordListModal').modal('hide');
}


//
// ajax methods
//
function doGetRecord(id, callback) {
    $.ajax({
        type: "POST",
        url: settings.urlGetRecordedData,
        dataType: "json",
        async: false,
        data: { id: id },
        success: function (response) {
            if (callback) {
                console.log('doGetRecord--> Called callback');
                callback(response);
            }
        },
        beforeSend: function () { },
        complete: function () { },
    });
}

function doSaveRecord(data) {
    $.ajax({
        type: "POST",
        url: settings.urlSaveRecordedData,
        dataType: "json",
        data: { data: data },
        async: false,
        success: function (response) {
            console.log("doSaveRecord--> Success handler");

            Playback.CurrentRecordId = response.recordId;
            Playback.isSavedRecord = true;
            Playback.clearLocalStorage();
        },
        beforeSend: function () { },
        complete: function () { }
    });
}

function doCheckExists(title, callbackSuccess) {
    $.ajax({
        type: "POST",
        url: settings.urlCheckExsitsRecord,
        dataType: "json",
        async: false,
        data: { title: title },
        success: function (response) {
            console.log("doCheckExists--> Success handler");
            callbackSuccess(response);
            doCloseRecordDetailsModal();
        },
        beforeSend: function () { },
        complete: function () { }
    });
}

function doGetRecordsList() {
    $.ajax({
        type: "POST",
        url: settings.urlGetRecordsList,
        dataType: "json",
        async: false,
        success: function (response) {
            console.log("doGetRecordsList--> Success handler");
            console.log(response);
            $('.records-list').html("");
            response.records.forEach(function (record) {
                var html = '<label class="radio"><input type="radio" name="optionsRadios" id="' + record.Id + '" value="' + record.Title + '">' + record.Title + '</label>';
                $('.records-list').append(html);
            });
        },
        beforeSend: function () { },
        complete: function () { }
    });
}


//
// Listeners
//
window.onbeforeunload = function () {
    //    if (!Playback.isSavedRecord) {
    //        if (confirm("You didn't save record. Save record now?")) {
    //            doCheckExists(Playback.recordName, saveRecordHandler);
    //        }
    //    }
    if (!Playback.isSavedRecord) {
        return "You didn't save record";
    }
};
window.addEventListener('beforeunload', function (event) {
    //    if (!Playback.isSavedRecord) {
    //        if (confirm("You didn't save record. Save record now?")) {
    //            doCheckExists(Playback.recordName, saveRecordHandler);
    //        }
    //    }
    if (!Playback.isSavedRecord) {
        return "You didn't save record";
    }
});
//window.addEventListener('unload', function (event) {
//    return false;
//});
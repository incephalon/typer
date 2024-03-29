
RecordableDrawing = function(canvasId)
{
    var self = this;
    this.canvas = null;
    this.width = this.height = 0;
    this.actions = new Array();
    this.ctx = null;
    this.mouseDown = false;
    this.currentRecording = null; //instance of Recording
    this.recordings = new Array(); //array of Recording objects
    this.lastMouseX = this.lastMouseY = -1;
    this.bgColor = "rgb(255,255,255)";
    this.currentLineWidth = 5;
    this.drawingColor = "rgb(0,0,0)";
    var pauseInfo = null;
    var screenShotTime = 0;

    onMouseDown = function(event)
    {
        var canvasX = $(self.canvas).offset().left;
        var canvasY = $(self.canvas).offset().top;

        self.mouseDown = true;
        var x = Math.floor(event.pageX - canvasX);
        var y = Math.floor(event.pageY - canvasY);

        var currAction = new Point(x, y, 0);
        self.drawAction(currAction, true);
        if (self.currentRecording != null)
            self.currentRecording.addAction(currAction);
        event.preventDefault();
        return false;
    }

    onMouseMove = function(event)
    {
        if (self.mouseDown)
        {
            var canvasX = $(self.canvas).offset().left;
            var canvasY = $(self.canvas).offset().top;

            var x = Math.floor(event.pageX - canvasX);
            var y = Math.floor(event.pageY - canvasY);

            var action = new Point(x, y, 1);
            if (self.currentRecording != null)
                self.currentRecording.addAction(action);
            self.drawAction(action, true);

            event.preventDefault();
            self.lastMouseX = x;
            self.lastMouseY = y;
            return false;
        }
    }

    onMouseUp = function(event)
    {
        self.mouseDown = false;
        self.lastMouseX = -1;
        self.lastMouseY = -1;
    }

    this.setColor = function(color)
    {
        self.drawingColor = color;
        var colorAction = new SetColor(color);
        self.actions.push(colorAction);
        if (self.currentRecording != null)
            self.currentRecording.addAction(colorAction);
    }

    this.setStokeSize = function(sizeArg)
    {
        self.currentLineWidth = sizeArg;
        var sizeAction = new SetStokeSize(sizeArg);
        self.actions.push(sizeAction);
        if (self.currentRecording != null)
            self.currentRecording.addAction(sizeAction);
    }

    this.startRecording = function()
    {
        self.currentRecording = new Recording(this);
        self.recordings = new Array();
        self.recordings.push(self.currentRecording);
        self.currentRecording.start();
    }

    this.stopRecording = function()
    {
        if (self.currentRecording != null)
            self.currentRecording.stop();
        self.currentRecording = null;
    }

    this.pauseRecording = function()
    {
        if (self.currentRecording != null)
            self.currentRecording.pause();
    }

    this.resumeRecording = function()
    {
        if (self.currentRecording != null)
            self.currentRecording.resumeRecording();
    }


    this.readyforScreenShot = function() {
        // clear screen
        // show the first screen
        self.recordings[0].screenShotInfo = null;
        screenShotTime = 0
        self.clearCanvas();
    }

    this.drawNextScreenShot = function(timeInterval) {
        // draw the next timeIntervel screen
        // if there is not return false.
        screenShotTime += timeInterval;
        // test
        return self.recordings[0].drawNextScreenShot(screenShotTime, timeInterval);
    }


    this.playRecording = function(onPlayStart, onPlayEnd, onPause, interruptActionStatus)
    {
        if (typeof interruptActionStatus == 'undefined')
            interruptActionStatus = null;

        if (self.recordings.length == 0)
        {
            alert("No recording loaded to play");
            onPlayEnd();
            return;
        }

        self.clearCanvas();

        onPlayStart();

        self.pausedRecIndex = -1;

        for (var rec = 0; rec < self.recordings.length; rec++)
        {
            if (interruptActionStatus != null)
            {
                var status = interruptActionStatus();
                if (status == "stop") {
                    pauseInfo = null;
                    break;
                }
                else
                if (status == "pause") {
                    __onPause(rec - 1, onPlayEnd, onPause, interruptActionStatus);
                    break;
                }
            }
            self.recordings[rec].playRecording(self.drawActions, onPlayEnd, function() {
                __onPause(rec - 1, onPlayEnd, onPause, interruptActionStatus);
            }, interruptActionStatus);
        }
    }



    function __onPause(index, onPlayEnd, onPause, interruptActionStatus)
    {
        pauseInfo = {
            "index": index,
            "onPlayend": onPlayEnd,
            "onPause": onPause,
            "interruptActionStatus": interruptActionStatus
        };
        if (onPause)
            onPause();
    }

    this.resumePlayback = function(onResume)
    {
        if (pauseInfo == null) {
            if (onResume)
                onResume(false);
            return;
        }

        var index = pauseInfo.index;
        var onPlayEnd = pauseInfo.onPlayend;
        var interruptActionStatus = pauseInfo.interruptActionStatus;
        var onPause = pauseInfo.onPause;

        if (self.recordings.length == 0)
        {
            alert("No recording loaded to play");
            onPlayEnd();
            return;
        }

        onResume(true);

        pauseInfo = null;

        for (var rec = index; rec < self.recordings.length; rec++)
        {
            if (interruptActionStatus != null)
            {
                var status = interruptActionStatus();
                if (status == "stop")
                    break;
                else if (status == "pause")
                {
                    __onPause(rec - 1, onPlayEnd, onPause, interruptActionStatus);
                    break;
                }
            }
            self.recordings[rec].playRecording(self.drawActions, onPlayEnd, function() {
                __onPause(rec - 1, onPlayEnd, onPause, interruptActionStatus);
            }, interruptActionStatus);
        }
    }

    this.clearCanvas = function()
    {
        self.ctx.fillStyle = self.bgColor;
        self.ctx.fillRect(0, 0, self.canvas.width, self.canvas.height);
    }

    this.removeAllRecordings = function()
    {
        self.recordings = new Array()
        self.currentRecording = null;
    }

    this.drawAction = function(actionArg, addToArray)
    {
        switch (actionArg.actionType)
        {
            case _POINT_ACTION :
                drawPoint(actionArg);
                break;
            case _SET_COLOR_ACTION :
                self.drawingColor = actionArg.color;
                break;
            case _SET_STOKE_SIZE:
                self.currentLineWidth = actionArg.size;
            default:
                break;
        }

        if (addToArray)
            self.actions.push(actionArg);
    }

    function drawPoint(actionArg)
    {
        var x = actionArg.x;
        var y = actionArg.y;

        switch (actionArg.type)
        {
            case 0: //moveto
                self.ctx.beginPath();
                self.ctx.moveTo(x, y);
                self.ctx.strokeStyle = self.drawingColor;
                self.ctx.lineWidth = self.currentLineWidth;
                break;
            case 1: //lineto
                self.ctx.lineTo(x, y);
                self.ctx.stroke();
                break;
        }
    }

    this.getRecordInterval = function() {
        return 100;
    }

    this.getPlayInterval = function() {
        return self.recordings[0].playTimeInterval;
    }

    this.setPlayInterval = function(timeinterval) {
        self.recordings[0].playTimeInterval = timeinterval;
    }


    __init = function()
    {
        self.canvas = $("#" + canvasId);
        if (self.canvas.length == 0)
        {
            return;
        }
        self.canvas = self.canvas.get(0);
        self.width = $(self.canvas).width();
        self.height = $(self.canvas).height();
        self.ctx = self.canvas.getContext("2d");

        //$(self.canvas).bind("vmousedown", onMouseDown);
        //$(self.canvas).bind("vmouseup", onMouseUp);
        //$(self.canvas).bind("vmousemove", onMouseMove);

        $(self.canvas).bind("mousedown", onMouseDown);
        $(self.canvas).bind("mouseup", onMouseUp);
        $(self.canvas).bind("mousemove", onMouseMove);

        self.clearCanvas();
    }

    __init();
}

Recording = function(drawingArg)
{
    var self = this;
    this.drawing = drawingArg;

    this.buffer = new Array(); //array of Point objects 
    this.timeInterval = 100; //10 miliseconds
    this.playTimeInterval = 100; //10 miliseconds
    this.currTime = 0;
    this.recTotalTime = 0;
    this.started = false;
    this.intervalId = null;
    this.currTimeSlot = 0;
    this.actionsSet = null; //of type ActionSet
    this.currActionSet = null;
    this.recStartTime = null;
    this.pauseInfo = null;
    this.currPlayTime = 0;
    this.playActionInterval = 0;

    var totalPauseTime = 0;
    var pauseStartTime = 0;

    this.screenShotInfo = null;

    this.start = function()
    {
        self.currTime = 0;
        self.currTimeSlot = -1;
        self.actionsSet = null;
        self.pauseInfo = null;

        self.recStartTime = (new Date()).getTime();
        self.intervalId = window.setInterval(self.onInterval, self.timeInterval);
        self.started = true;
    }

    this.stop = function()
    {
        if (self.intervalId != null)
        {
            window.clearInterval(self.intervalId);
            self.intervalId = null;
        }
        self.started = false;
        
        if (voice_flag == false) {
            var SS = self.recTotalTime / 1000;
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
        }
    }

    this.pause = function()
    {
        pauseStartTime = (new Date()).getTime();
        window.clearInterval(self.intervalId);
    }

    this.resumeRecording = function() {
        totalPauseTime += (new Date()).getTime() - pauseStartTime;
        pauseStartTime = 0;
        self.intervalId = window.setInterval(self.onInterval, self.timeInterval);
    }

    this.onInterval = function()
    {
        if (self.buffer.length > 0)
        {
            var timeSlot = (new Date()).getTime() - self.recStartTime - totalPauseTime;

            if (self.currActionSet == null)
            {
                self.currActionSet = new ActionsSet(timeSlot, self.buffer);
                self.actionsSet = self.currActionSet;
            }
            else
            {
                var tmpActionSet = self.currActionSet;
                self.currActionSet = new ActionsSet(timeSlot, self.buffer);
                tmpActionSet.next = self.currActionSet;
            }

            self.buffer = new Array();
        }
        self.currTime += self.timeInterval;
        // to do start
        //if (voice_flag == false) {
            var SS = self.currTime / 1000;
            var HH = Math.floor(SS / 3600);
            var MM = Math.floor((SS % 3600) / 60);
            var LSS = Math.floor(SS % 60);
            var formatted;
            if (HH == 0)
                formatted = ((MM < 10) ? ("0" + MM) : MM) + ":" + ((LSS < 10) ? ("0" + LSS) : LSS);
            else
                formatted = ((HH < 10) ? ("0" + HH) : HH) + ":" + ((MM < 10) ? ("0" + MM) : MM) + ":" + ((LSS < 10) ? ("0" + LSS) : LSS);

            $("#playTime").text(formatted);
            $("#totalTime").text('00:00');
        //}
        // to do end
    }

    this.addAction = function(actionArg)
    {
        if (!self.started)
            return;
        self.buffer.push(actionArg);
        self.recTotalTime = self.currTime;
    }

    this.drawNextScreenShot = function(screenShotTime, timeInterval) {
        var isLast = false;
        var actionSetArg = null;
        var interval = 0;

        if (self.screenShotInfo == null) {
            actionSetArg = self.actionsSet;
            isfirst = true;
        } else {
            actionSetArg = self.screenShotInfo['actionset'];
            isfirst = false;
        }
        interval = actionSetArg.interval;

        while (screenShotTime > interval) {
            self.drawActions(actionSetArg.actions, null, isfirst, false);
            if (actionSetArg.next == null) {
                self.screenShotInfo = null;
                isLast = true;
                return isLast;
            }
            actionSetArg = actionSetArg.next
            interval = actionSetArg.interval;
        }

        self.screenShotInfo = {
            "actionset": actionSetArg
        };
        return isLast;
    }

    this.playRecording = function(callbackFunctionArg, onPlayEnd, onPause, interruptActionStatus)
    {
        if (self.actionsSet == null)
        {
            if (typeof onPlayEnd != 'undefined' && onPlayEnd != null)
                onPlayEnd();
            return;
        }

        self.playTimeInterval = self.timeInterval;

        var status = "";
        if (interruptActionStatus != null && interruptActionStatus() == 'resume')
        {
            self.currPlayTime = self.pauseInfo['currPlayTime'];
            self.playActionInterval = self.pauseInfo['actionset'].interval - self.pauseInfo['playActionIntervalDiff'];
            var actionSet = self.pauseInfo['actionset'];

            self.scheduleDraw(self.pauseInfo['actionset'], self.pauseInfo['actionset'].interval, callbackFunctionArg, onPlayEnd, onPause, self.pauseInfo['isFirst'], interruptActionStatus);


        } else {

            self.currPlayTime = 0;
            self.playActionInterval = 0;

            self.scheduleDraw(self.actionsSet, self.actionsSet.interval, callbackFunctionArg, onPlayEnd, onPause, true, interruptActionStatus);
        }
    }

    this.intervalDraw = function(actionSetArg, callbackFunctionArg, onPlayEnd, onPause, isFirst, interruptActionStatus)
    {
        var intervalDiff = -1;
        var isLast = true;
        if (actionSetArg.next != null)
        {
            isLast = false;
            intervalDiff = actionSetArg.next.interval - actionSetArg.interval;
        }
        if (intervalDiff >= 0)
            self.scheduleDraw(actionSetArg.next, intervalDiff, callbackFunctionArg, onPlayEnd, onPause, false, interruptActionStatus);

        self.drawActions(actionSetArg.actions, onPlayEnd, isFirst, isLast);
    }


    this.scheduleDraw = function(actionSetArg, interval, callbackFunctionArg, onPlayEnd, onPause, isFirst, interruptActionStatus)
    {
        var status = "";
        if (interruptActionStatus != null)
        {
            status = interruptActionStatus();
            if (status == 'stop')
            {
                self.pauseInfo = null;
                onPlayEnd();
                return;
            }
        }

        if (status == "pause")
        {
            self.pauseInfo = {
                "actionset": actionSetArg,
                "callbackFunc": callbackFunctionArg,
                "onPlaybackEnd": onPlayEnd,
                "onPause": onPause,
                "isFirst": isFirst,
                "interruptActionsStatus": interruptActionStatus,
                "currPlayTime": self.currPlayTime,
                "playActionIntervalDiff": interval - self.playActionInterval
            };

            if (onPause)
                onPause();
            return;
        }

        window.setTimeout(function() {
            self.currPlayTime += self.timeInterval;
            self.playActionInterval += self.timeInterval;

            if (voice_flag == false) {
                var SS = self.currPlayTime / 1000;
                var HH = Math.floor(SS / 3600);
                var MM = Math.floor((SS % 3600) / 60);
                var LSS = Math.floor(SS % 60);
                var formatted;
                if (HH == 0)
                    formatted = ((MM < 10) ? ("0" + MM) : MM) + ":" + ((LSS < 10) ? ("0" + LSS) : LSS);
                else
                    formatted = ((HH < 10) ? ("0" + HH) : HH) + ":" + ((MM < 10) ? ("0" + MM) : MM) + ":" + ((LSS < 10) ? ("0" + LSS) : LSS);
                $("#playTime").text(formatted);
                var total_time = record_datas[cur_record]['draw_rec_total'];
                var percent = self.currPlayTime / total_time * 100;
                $("#play_process .bar").css("width", percent + "%");
            }

            if (self.playActionInterval > interval)
            {
                self.playActionInterval = self.playActionInterval - interval;
                self.intervalDraw(actionSetArg, callbackFunctionArg, onPlayEnd, onPause, isFirst, interruptActionStatus)
            } else {
                self.scheduleDraw(actionSetArg, interval, callbackFunctionArg, onPlayEnd, onPause, isFirst, interruptActionStatus);
            }
        }, self.playTimeInterval);
    }

    this.resume = function()
    {
        if (!self.pauseInfo)
            return;

        self.scheduleDraw(self.pauseInfo.actionset, 0,
                self.pauseInfo.callbackFunc,
                self.pauseInfo.onPlaybackEnd,
                self.pauseInfo.onPause,
                self.pauseInfo.isFirst,
                self.pauseInfo.interruptActionsStatus);

        self.pauseInfo = null;
    }

    this.drawActions = function(actionArray, onPlayEnd, isFirst, isLast)
    {
        for (var i = 0; i < actionArray.length; i++)
            self.drawing.drawAction(actionArray[i], false);

        if (isLast)
        {
            onPlayEnd();
        }
    }
}

_POINT_ACTION = 1;
_SET_COLOR_ACTION = 2;
_SET_STOKE_SIZE = 3;

//Action Types
//	1 - Point
//	2 = SetColor
Action = function()
{
    var self = this;
    this.actionType; // 1 - Point, other action types could be added later
    this.x = 0;
    this.y = 0;
    this.isMovable = false;

    if (arguments.length > 0)
    {
        self.actionType = arguments[0];
    }
    if (arguments.length > 2)
    {
        self.x = arguments[1];
        self.y = arguments[2];
    }
}

Point = function(argX, argY, typeArg)
{
    var self = this;
    this.type = typeArg; //0 - moveto, 1 - lineto

    Action.call(this, _POINT_ACTION, argX, argY);
}

Point.prototype = new Action();

ActionsSet = function(interalArg, actionsArrayArg)
{
    var self = this;

    this.actions = actionsArrayArg;
    this.interval = interalArg;
    this.next = null;
}

SetColor = function(colorValue)
{
    var self = this;
    this.color = colorValue;

    Action.call(this, _SET_COLOR_ACTION);
}
SetColor.prototype = new Action();

SetStokeSize = function(sizeArg)
{
    var self = this;
    this.size = sizeArg;

    Action.call(this, _SET_STOKE_SIZE);
}
SetStokeSize.prototype = new Action();
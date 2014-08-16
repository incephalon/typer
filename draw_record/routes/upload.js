var express = require('express');
var router = express.Router();
var fs = require('fs');
var exec = require("child_process").exec;
//var command = new FfmpegCommand();

router.post('/createdirectory', function(req, res, next) {
    var directory_name = req.body.directory;

    rmDir('./upload');
    fs.mkdir("./upload", function(e) {
        res.send('fail');
        return;
    });

    fs.mkdir("./upload/" + directory_name, function(e) {
        res.send('fail');
        return;
    });
    res.send('success');
});

router.post('/audio', function(req, res, next) {
    var tmpdata = '';
    req.on('data', function(chunk) {
        tmpdata += chunk;
    });
    req.on('end', function() {
        req.rawBody = tmpdata;
        var audioData = JSON.parse(req.rawBody);
        var buf = new Buffer(audioData.blob, 'base64');
        var directory = audioData.directory;

        fs.writeFile('./upload/' + directory + '/audio.wav', buf, 'binary', function(err) {
            if (err)
                throw err;
        });
    });
    res.send('success');
});

router.post('/image', function(req, res, next) {
    var img = JSON.parse(req.body.img);
    var index = req.body.index;
    var isLast = req.body.isLast;
    var directory = req.body.directory;

    var data = img.replace(/^data:image\/\w+;base64,/, "");
    var buf = new Buffer(data, 'base64');
    fs.writeFile('./upload/' + directory + '/' + index + '.png', buf, function(err) {
        if (err)
            throw err;
    });

    if (isLast == 'true') {
        var command = '';
        if (fs.existsSync('./upload/' + directory + '/' + 'audio.wav')) {
            command = 'ffmpeg -r 10 -i ./upload/' + directory + '/' + '%d.png -i ' + './upload/' + directory + '/' + 'audio.wav -r 10 ' + './upload/' + directory + '/' + directory + 'video.flv';
        } else {
            command = 'ffmpeg -r 10 -i ./upload/' + directory + '/' + '%d.png -r 10 ' + './upload/' + directory + '/' + directory + 'video.flv';
        }

        exec(command);
        //ffmpeg().inputFPS(10).run();
        /*
         .addInput('./upload/' + directory + '/' + '%03d.png')
         .addInput('./upload/' + directory + '/' + 'audio.mp3')
         .toFormat('flv')
         .saveToFile('./upload/' + directory + '/' + 'video.flv',
         function(retcode, error) {
         console.log('file has been converted succesfully');
         }).run();
         */
    }
    res.send('success');
});

router.post('/download', function(req, res, next) {
    var directory = req.body.directory;
    filename = './upload/' + directory + '/' + directory + 'video.flv';
    res.download(filename);
});

rmDir = function(dirPath) {
    try {
        var files = fs.readdirSync(dirPath);
    }
    catch (e) {
        return;
    }
    if (files.length > 0)
        for (var i = 0; i < files.length; i++) {
            var filePath = dirPath + '/' + files[i];
            if (fs.statSync(filePath).isFile())
                fs.unlinkSync(filePath);
            else
                rmDir(filePath);
        }
    fs.rmdirSync(dirPath);
};

module.exports = router;

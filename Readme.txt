1. draw and voice recording function
  - select color and draw in the canvas
  - record drawing action
  - play draw process
  - voice is added for record & play with drawing
  - recorded data can be shown behind the canvas
  - select and play or convert to video file, or delect recorded data.

2. convert to video file (flv file) function
  - in the canvas, draw picture by time interval and capture the screenshot
  - send to the server screenshot pictures and recorded audio file.
  - video file is made in server side. and download it.

3. in the recorded data
  - first directory icon is shown if the recorded data is selected or not. 
     it can be used to select the recorded data.
  - second volume icon is shown if the recorded data have the audio or not.
  - third time label is shown the recorded Total time by minute:second.
  - forth trash icon is the button to delete this recorded data.

4. system requirement

  - for convert video file from screenshot and audio, ffmpeg is used.
  - so in the server side ffmpeg have to be installed.(can support both of windows & linux)
  - it is nodejs project, nodejs have to be installed also.

5. run
   in the console.
   #npm install -d
   #node server.js

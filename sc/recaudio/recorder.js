// converts blob to base64
var blobToBase64 = function (blob, cb) {
    var reader = new FileReader();
    reader.onload = function () {
        var dataUrl = reader.result;
        var base64 = dataUrl.split(',')[1];
        cb(base64);
    };
    reader.readAsDataURL(blob);
};



(function (window){

  var WORKER_PATH = 'recaudio/recorderWorker.js';
    
    var audiofiledownloadurl;
    var audiouploadblob;
     

  var Recorder = function(source, cfg){
    var config = cfg || {};
    var bufferLen = config.bufferLen || 4096;
    this.context = source.context;
    if(!this.context.createScriptProcessor){
       this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
    } else {
       this.node = this.context.createScriptProcessor(bufferLen, 2, 2);
    }
   
    var worker = new Worker(config.workerPath || WORKER_PATH);
    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: this.context.sampleRate
      }
    });
    var recording = false,
      currCallback;

    this.node.onaudioprocess = function(e){
      if (!recording) return;
      worker.postMessage({
        command: 'record',
        buffer: [
          e.inputBuffer.getChannelData(0),
          e.inputBuffer.getChannelData(1)
        ]
      });
    }

    this.configure = function(cfg){
      for (var prop in cfg){
        if (cfg.hasOwnProperty(prop)){
          config[prop] = cfg[prop];
        }
      }
    }

    this.record = function(){
      recording = true;
    }

    this.stop = function(){
      recording = false;
    }

    this.clear = function(){
      worker.postMessage({ command: 'clear' });
    }

    this.getBuffers = function(cb) {
      currCallback = cb || config.callback;
      worker.postMessage({ command: 'getBuffers' })
    }

    this.exportWAV = function(cb, type){
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportWAV',
        type: type
      });
    }

    this.exportMonoWAV = function(cb, type){
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportMonoWAV',
        type: type
      });
    }

    worker.onmessage = function(e){
      var blob = e.data;
      currCallback(blob);
    }

    source.connect(this.node);
    this.node.connect(this.context.destination);   // if the script node is not connected to an output the "onaudioprocess" event is not triggered in chrome.
  };

    Recorder.setupDownload = function (blob, filename){
        
        console.log('save audio file');

        var url = (window.URL || window.webkitURL).createObjectURL(blob);
        var link = document.getElementById("save");
        link.href = url;
        link.download = filename || 'output.wav';
        
       //console.log(filename || 'output.wav')
       //console.log(url)
        audiofiledownloadurl = url;
        audiouploadblob = blob;
        console.log('before' + link.download);
        $('.audioplayrec').attr("src", url.replace('blob:', ''));
        
        save_server_auto();

        console.log('after' + $('.audioplayrec').attr("src"));
 

        $('#savenew').show();

  }
    
    
    
    function save_server_auto()         
        {
        
        $("#playnew").remove();
        blobToBase64(audiouploadblob, function (base64) { // encode
            var update = { 'blob': base64 };
            
            socket.emit('save_file', audiofiledownloadurl, update, user_new_camp_obj.campaign_name + '_' + user_new_camp_obj.current_audio_msg, function (confirmation) { 

    
                $('.playaudiodiv').html('<audio id="playnew"  controls><source src="' + 'useraudio/' + user_new_camp_obj.campaign_name + '_' + user_new_camp_obj.current_audio_msg + '.wav' +  '?noCache = ' + Math.floor(Math.random() * 1000000)  + '" type="audio/wav"></audio>')
                

              

                
                console.log(confirmation);
                
            });











        });

        }
    

    $("#savenew").click(function () {
        //hope the server sets Content-Disposition: attachment!
        console.log(user_new_camp_obj.campaign_name + '_' + user_new_camp_obj.current_audio_msg);

        $("#save span").trigger("click");
 

        $('#savenew').hide();
        $('#editnew').show();
        
        blobToBase64(audiouploadblob, function (base64) { // encode
            var update = { 'blob': base64 };
    
            socket.emit('save_file', audiofiledownloadurl, update, user_new_camp_obj.campaign_name + '_' + user_new_camp_obj.current_audio_msg);
        });

        
        
        

      



    });

    

  window.Recorder = Recorder;

})(window);

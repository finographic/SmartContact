var express = require('express');
var app = express();
var request = require("request");
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var flash = require('connect-flash');
//astrisk client 
var client = require('ari-client');
//astrisk ari IVR client 
var client_ari_ivr = require('ari-client');


//astrisk sox test 

var SoxCommand = require('sox-audio');
var command = SoxCommand();

//wav info 
var wavFileInfo = require('wav-file-info');



get_wav_duration = function (wavefile)
{

    return    wavFileInfo.infoByFilename(wavefile, function (err, info) {
    if (err) throw err;
   // console.log(info.duration);

        return info.duration;
    });

       

}





var util = require('util');
var OAuth = require('oauth').OAuth;
//passport 
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;

//Socket IO connection 
var fs = require('fs');

//Smart contact key crt
var options = { key: fs.readFileSync('sc/keys/smartcontact.key'), cert: fs.readFileSync('sc/keys/bundle.crt') };

//DB function database 
var db = require('./db');

//moment time calc
var moment = require('moment');
moment().format();

request = require('request')
parser = require('node-feedparser')

var listenporthttps = 543
var listenporthttp = 3000


var http = require('http').Server(app);
var https = require('https').Server(options, app).listen(listenporthttps);
var url = require('url');

var io = require('socket.io')(http);

//test object 
var objuserinfo = {};
objuserinfo.conuserinfo = [];
objuserinfo.conuserinfo_main = {};
objuserinfo.dialinfo = [];
objuserinfo.logininfo = [];
objuserinfo.scmsgleave = {};
objuserinfo.inbinfo = [];


app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(flash());


//session req
app.use(expressSession({
    secret: 'ancientchinesesecret',
    resave: false,
    saveUninitialized: false
}));


//passport
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
//use for statics css files etc 
app.use(express.static(__dirname + '/sc'));
app.use(express.static(__dirname + '/semantic'));

app.get('/', function (req, res) {
    
    //if cooke destroy 
    if (req.isAuthenticated() == true) { req.session.destroy(function (err) { }); }
    res.render('index', { user : req.user });
});




//testing sign on 
app.get('/scuser', function (req, res) {
    
    req.session.destroy();
    res.render('scuser', { user : req.user });
});



//login for smart contact user non agent 
app.get('/login', function (req, res) {
    
    //if cooke destroy 
    if (req.isAuthenticated() == true) { req.session.destroy(function (err) { }); }
    
    
    
    
    
    res.render('sm_login', { user : req.user });
});



//user agent
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        // req.user is available for use here
        return next();
    }
    
    // denied. redirect to login
    res.redirect('/')
}


app.get('/useragent', ensureAuthenticated, function (req, res) {
    
    //res.send("access granted. secure stuff happens here");
    
    
    
    
    
    return res.render('scagent', { user : req.user });

});




app.get('/logout', function (req, res) {
    
    req.session.destroy();
    res.redirect('/');
});


app.get('/logoutuser', function (req, res) {
    
    req.session.destroy();
    res.redirect('/login');
});






app.get('*', function (req, res) {
    res.status(404).render('404');

});


// passport config
passport.use(new LocalStrategy({ passReqToCallback: true }, function (req, username, password, done) {
    
    
    var localauth = '';
    
    
    db.logincheck(username, password, req.body.stationid)
    .then(function (data) {
        
        console.log('auth station id login: ' + req.body.stationid + ' user name password : ' + username + '|' + password);
        
        if (data) {
            
            if (data.end_point_ext == null) {
                
                return done(null, false, { message: 'Station ID not Found' });

            } else {
                
                
                return done(null, JSON.stringify(data));
        
            }
        } else {
            
            return done(null, false, { message: 'Incorrect username /  Password.' });
        }
            

    }).catch(function (err) {
        
        console.log(err);
        
        return done(null, false, { message: 'Incorrect username /  Password.' });
    })
    

    

}));

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});






//post for login of sc user non agent smart contact portal
app.post('/scuser', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        
        console.log('auth user');
        
        
        if (err) { return next(err); }
        
        if (!user) {
            req.session.destroy();
            
            var string = encodeURIComponent(info.message);
            
            
            return res.redirect('login?err=' + string);
        }
        
        req.logIn(user, function (err) {
            if (err) { return next(err); }
            
            
            
            
            return res.render('scuser', { user : req.user });
        });

    })(req, res, next);
});


//post for login of sc agent 
app.post('/scagent', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        
        console.log('auth');
        
        
        if (err) { return next(err); }
        
        if (!user) {
            req.session.destroy();
            
            var string = encodeURIComponent(info.message);
            
            
            return res.redirect('/?err=' + string);
        }
        
        req.logIn(user, function (err) {
            if (err) { return next(err); }
            
            return res.render('scagent', { user : req.user });
        });

    })(req, res, next);
});


var addStandardListeners = function (command, filename) {
    command.on('start', function (commandLine) {
        console.log('Spawned sox with command ' + commandLine);
    });
    
    command.on('progress', function (progress) {
        console.log('Processing progress: ', progress);
    });
    
    command.on('error', function (err, stdout, stderr) {
        console.log('Cannot process audio: ' + err.message);
        console.log('Sox Command Stdout: ', stdout);
        console.log('Sox Command Stderr: ', stderr)
    });
    
    command.on('end', function () {
        
        fs.chown(filename, 499, 498, function (err) {
            if (err) { return console.error(err); }
        });
                
        console.log('Sox command succeeded!');
    });
};

/* Concatenate all audio files in the list, and save the result in outputFileName */
var concat_audio_func = function (fileNameList, outputFileName) {
    var command = SoxCommand();
    fileNameList.forEach(function addInput(fileName) {
        command.input(fileName);
    });
    command.output(outputFileName)
		.concat();
    
    addStandardListeners(command, outputFileName);
    command.run()
    return command;
}


/* Concatenate all audio files in the list, and save the result in outputFileName */
var concat_audio_func_arr = function (fileNameList, outputFileName) {
    var command = SoxCommand();
    fileNameList.forEach(function addInput(fileName) {
        command.input(fileName.file);
    });
    command.output(outputFileName)
		.concat();
    
    addStandardListeners(command, outputFileName);
    command.run()
    return command;
}


//sox testing 
var trimaudio_func = function (audioin, starttrim, filelen) {
    
    console.log(filelen + ' : in func file len');

    
    var command3 = SoxCommand()
    .input(audioin + ".wav")
.output(audioin + "_trim.wav")
.addEffect('fade', [1, 0, 1]);
    

   // .trim(starttrim, filelen)
 //   .addEffect('fade', '1 6 1');


    
    command3.once('prepare', function (args) {
        console.log('Preparing sox command with args ' + args.join(' '));
    });
    
    command3.once('start', function (commandLine) {
        console.log('Spawned sox with command ' + commandLine);
    });
    
    command3.once('progress', function (progress) {
        console.log('Processing progress: ', progress);
    });
    
    command3.once('error', function (err, stdout, stderr) {
        console.log('Cannot process audio: ' + err.message);
        console.log('Sox Command Stdout: ', stdout);
        console.log('Sox Command Stderr: ', stderr)
    });
    
    command3.once('end', function () {
        console.log('Sox command succeeded!');
        
        //delete and rename back 
       fs.unlink(audioin + ".wav", function (err) {
            
            if (err) { return console.error(err); }
            
            
            fs.rename(audioin + "_trim.wav", audioin + ".wav", function (err) {
                if (err) { return console.error(err); }
                
                //change back perm
                fs.chown(audioin + ".wav", 499, 498, function (err) {
                    if (err) { return console.error(err); }
                });
                
                
                
               console.log('renamed complete');
         });
    


        });
        
    });
    
 
    command3.run();
    
    return command3;

}




//yahoo app key
//My AppsTrustbuilder
//Client ID(Consumer Key)
//dj0yJmk9MXI1WDYzaXRYbmVSJmQ9WVdrOVlYTmhNMFJETjJjbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD1lYg--
//Client Secret(Consumer Secret)
//4ec400d36092c47fed6cea21431c215aa8b90b26

//find index of user id by socket id 
function findsockinarr(sockid, findtype) {
    d = new Date();
    var indexret;
    objuserinfo.conuserinfo.filter(function (obj, index) {
        if (obj.useridsock === sockid) {
            indexret = index;
            if (findtype == 1) {
                objuserinfo.conuserinfo[indexret].lastchattime = d.toLocaleString();
            }
        }
    });
    return indexret;
};

//find index of user id by chnnel id 
function findinarrbychannel(channelidvar) {
    var indexret;
    objuserinfo.conuserinfo.filter(function (obj, index) {
        if (obj.chan === channelidvar) {
            indexret = index;
           
        }
    });
    return indexret;
};

//find index of user id by bridge id 
function findinarrbybridge(bridgeidvar) {
    var indexret;
    objuserinfo.conuserinfo.filter(function (obj, index) {
        if (obj.bridge === bridgeidvar) {
            indexret = index;
           
        }
    });
    return indexret;
};

//Function add inbound call to object for eval 
function inbinsert_obj(channel, callback) {
    
    
    if (channel.dialplan.exten.length == 11) {
        
        console.log('Inbound Call Function insert into inbound obj : ' + channel.id);
        
        
        objuserinfo.inbinfo[channel.id] = [];
        
        
        //push into inbound info obj for channel 
        objuserinfo.inbinfo[channel.id].did = channel.dialplan.exten;
        objuserinfo.inbinfo[channel.id].currentagchan = '';
        objuserinfo.inbinfo[channel.id].chan_id = channel.id;
        objuserinfo.inbinfo[channel.id].channame = channel.name;
        objuserinfo.inbinfo[channel.id].att_wk = 0;
        objuserinfo.inbinfo[channel.id].contact_wk = 0;
        objuserinfo.inbinfo[channel.id].inbound_dt = moment().format();
        objuserinfo.inbinfo[channel.id].dispo_wk = 0;
        objuserinfo.inbinfo[channel.id].skill_wk = 0;
        objuserinfo.inbinfo[channel.id].skill_name = '';
        objuserinfo.inbinfo[channel.id].socketid = '';
        objuserinfo.inbinfo[channel.id].ani = channel.caller.number;
        objuserinfo.inbinfo[channel.id].bridge_id = '';
        objuserinfo.inbinfo[channel.id].online_user_wk = '';
        objuserinfo.inbinfo[channel.id].dispos = '';
        objuserinfo.inbinfo[channel.id].intro_audio = '';
        objuserinfo.inbinfo[channel.id].hold_audio = '';
        objuserinfo.inbinfo[channel.id].whisper_audio = '';
        objuserinfo.inbinfo[channel.id].callerinfo_acd = channel.caller;
        objuserinfo.inbinfo[channel.id].ready = 0;
        
        
        return callback(inbinsert_db(objuserinfo.inbinfo[channel.id]));
        




    }

};

//Function inbound to database
function inbinsert_db(insert_channel_obj) {
    
    
    console.log('inbound to db');
    db.insertattrecinb(insert_channel_obj, 'SCI').then(function (data) {
        
        console.log('inbound to db after insert');
        
        //console.log(data);
        
        
        //after insert tag record in obj with current attempt_wk 
        objuserinfo.inbinfo[insert_channel_obj.chan_id].att_wk = data.att_wk;
        objuserinfo.inbinfo[insert_channel_obj.chan_id].dispos = data.dispo_db_display;
        objuserinfo.inbinfo[insert_channel_obj.chan_id].intro_audio = data.dnis_info[0].inb_intro_audio;
        objuserinfo.inbinfo[insert_channel_obj.chan_id].hold_audio = data.dnis_info[0].inb_hold_audio;
        objuserinfo.inbinfo[insert_channel_obj.chan_id].whisper_audio = data.dnis_info[0].ag_whisper;
        objuserinfo.inbinfo[insert_channel_obj.chan_id].skill_wk = data.dnis_info[0].skill_wk;
        objuserinfo.inbinfo[insert_channel_obj.chan_id].skill_name = data.dnis_info[0].skill_name;
        objuserinfo.inbinfo[insert_channel_obj.chan_id].survey = data.srv_info_display;
        objuserinfo.inbinfo[insert_channel_obj.chan_id].surveyqa = data.qst_display;
        objuserinfo.inbinfo[insert_channel_obj.chan_id].surveyans = data.srv_rsp;
        console.log('inbound to DB return att_wk updated ' + data.att_wk);
        
        
        return objuserinfo.inbinfo[insert_channel_obj.chan_id];


    });

}


// handler for client being loaded
function clientLoadedv2(err, client) {
    
    
    
    console.log('client loaded');
    
    
    function stasisStartinbhandler(event, channel) {
        
        
        console.log('stasisStartinbhandler');
        //Check if inbound call from Trunk 
        if (channel.dialplan.exten.length == 11) {
            
            console.log('Inbound Call');
            
            // console.log(util.format(channel.dialplan.exten));
            
            objuserinfo.inbinfo[channel.id] = [];
            
            
            
            //push into leave alone on hang up message array 
            objuserinfo.inbinfo[channel.id].did = channel.dialplan.exten;
            
            objuserinfo.inbinfo[channel.id].currentagchan = '';
            objuserinfo.inbinfo[channel.id].chan_id = channel.id;
            objuserinfo.inbinfo[channel.id].channame = channel.name;
            objuserinfo.inbinfo[channel.id].att_wk = 0;
            objuserinfo.inbinfo[channel.id].contact_wk = 0;
            objuserinfo.inbinfo[channel.id].inbound_dt = moment().format();
            objuserinfo.inbinfo[channel.id].dispo_wk = 0;
            objuserinfo.inbinfo[channel.id].skill_wk = 0;
            objuserinfo.inbinfo[channel.id].skill_name = '';
            objuserinfo.inbinfo[channel.id].socketid = '';
            objuserinfo.inbinfo[channel.id].ani = channel.caller.number;
            objuserinfo.inbinfo[channel.id].bridge_id = '';
            objuserinfo.inbinfo[channel.id].online_user_wk = '';
            objuserinfo.inbinfo[channel.id].dispos = '';
            objuserinfo.inbinfo[channel.id].intro_audio = '';
            objuserinfo.inbinfo[channel.id].hold_audio = '';
            objuserinfo.inbinfo[channel.id].whisper_audio = '';
            objuserinfo.inbinfo[channel.id].callerinfo_acd = channel.caller;
            objuserinfo.inbinfo[channel.id].ready = 0;
            
            
            
            
            //console.log(objuserinfo.inbinfo[channel.id]);
            
            console.log('inbound to db');
            db.insertattrecinb(objuserinfo.inbinfo[channel.id], 'SCI').then(function (data) {
                
                console.log('inbound to db after insert');
                //after insert tag record in obj with current attempt_wk 
                objuserinfo.inbinfo[channel.id].att_wk = data.att_wk;
                objuserinfo.inbinfo[channel.id].dispos = data.dispo_db_display;
                objuserinfo.inbinfo[channel.id].intro_audio = data.dnis_info[0].inb_intro_audio;
                objuserinfo.inbinfo[channel.id].hold_audio = data.dnis_info[0].inb_hold_audio;
                objuserinfo.inbinfo[channel.id].whisper_audio = data.dnis_info[0].ag_whisper;
                objuserinfo.inbinfo[channel.id].skill_wk = data.dnis_info[0].skill_wk;
                objuserinfo.inbinfo[channel.id].skill_name = data.dnis_info[0].skill_name;
                objuserinfo.inbinfo[channel.id].survey = data.srv_info_display;
                objuserinfo.inbinfo[channel.id].surveyqa = data.qst_display;
                
                
                
                console.log('data inbound');
                console.log(data);
                //  console.log(objuserinfo.inbinfo[channel.id]);
                
                channel.answer(function (err) {
                    
                    var bridge = client.Bridge();
                    
                    bridge.create({ type: 'mixing' }).then(function (bridge) {
                        
                        
                        
                        objuserinfo.inbinfo[channel.id].bridge_id = bridge.id
                        
                        bridge.addChannel({ channel: channel.id }).then(function () { })
                                            .catch(function (err) { console.log('Add bridge inbound error') });
                        
                        
                        console.log('$$$$ Play intor audio' + objuserinfo.inbinfo[channel.id].intro_audio);
                        
                        client.channels.play({ channelId: channel.id, media: objuserinfo.inbinfo[channel.id].intro_audio }).then(function (playback) {
                            
                            
                            console.log('Play back starts');
                            
                            playback.on('PlaybackFinished', function (event, playback) {
                                
                                
                                //get id to play music on hold 
                                console.log('play back music on hold to channel : ' + playback.target_uri.replace('channel:', ''));
                                
                                
                                //play hold music 
                                client.channels.play({
                                    channelId: playback.target_uri.replace('channel:', ''),
                                    media: objuserinfo.inbinfo[channel.id].hold_audio,
                                    playbackId: playback.target_uri.replace('channel:', '')
                                })
                                           .then(function (playback) {
                                    
                                    
                                    // make channel obj ready for call and stop play back 
                                    
                                    objuserinfo.inbinfo[channel.id].ready = 1;
                                    
                                })
                                           .catch(function (err) { console.log('channel not found to play hold'); });
                            });
                        
                        }).catch(function (err) { console.log('Intro Hold play error') });
                    


                    }).catch(function (err) { console.log('Channel ans inbound error') });
                    
                    //send to agent here last inbound Randy 
            
                });

    

            }
            
            
            
            //end here
            ).catch(function (err) { console.log('Stat start error'); console.log(err) });



     


        } else {
            
            console.log('Outbound Call');
        }
    
    
    }
    
    function stasisendinbhandler(event, channel) {
        
        
        //Check if inbound call from Trunk 
        if (channel.dialplan.exten.length == 11) {
            
            console.log('Inbound Call end clean up');
            
            objuserinfo.inbinfo[channel.id].dispo_wk = -1;
            
            
            
            //dispo rec hang up  inbound call
            db.updatedisporecinb(objuserinfo.inbinfo[channel.id]).then(function (data) {
                //get dial infomation for afte dispo
                console.log('Dispo to DB update confirmation to success');
            }).catch(function (err) {
                console.log('Update dispo error');
            });
            
            
            
            //with agent 
            if (objuserinfo.inbinfo[channel.id].socketid != '') {
                
                
                io.to('/#' + objuserinfo.inbinfo[channel.id].socketid).emit('hanguponuser', objuserinfo.inbinfo[channel.id].socketid);
                
                client.bridges.removeChannel({ bridgeId: objuserinfo.inbinfo[channel.id].bridge_id  , channel: objuserinfo.inbinfo[channel.id].currentagchan }).then(function () {
                    
                    
                    client.bridges.destroy({ bridgeId: objuserinfo.inbinfo[channel.id].bridge_id }).then(function (bridge) {
                        //remove from inbound array obj
                        delete objuserinfo.inbinfo[channel.id]
                        console.log(objuserinfo.inbinfo);

                    }).catch(function (err) { });
            
                }).catch(function (err) { });
            
            //with out agent 
            } else {
                
                client.bridges.destroy({ bridgeId: objuserinfo.inbinfo[channel.id].bridge_id }).then(function (bridge) {
                    
                    console.log('destroy bridge for none agent call');
                    
                    
                    
                    //remove from inbound array obj
                    
                    if (typeof objuserinfo.inbinfo[channel.id] !== 'undefined') {
                        delete objuserinfo.inbinfo[channel.id]
                    }
                    //console.log(objuserinfo.inbinfo);

                }).catch(function (err) { });
                
                console.log('No agent on call');

            }
            
        }
    
    
    }
    
    //client.on('StasisStart', stasisStartinbhandler);
    
    client.on('StasisStart', inboundtesthandle);
    
    function inboundtesthandle(event, incoming_channel) {
        
        
        //inbound insert to DB
        
        inbinsert_obj(incoming_channel, function () {
            
            incoming_channel.answer().then(function (rtn_data) {
                
                var bridge = client.Bridge();
                
                incoming_channel.once('ChannelHangupRequest', function (event, channel) {
                    
                    console.log('Hangup Inbound Channel DB' + channel.id);
                    //dispo rec hang up  inbound call
                    
                    //with out agent 
                    
                    if (typeof objuserinfo.inbinfo[channel.id] !== 'undefined') {
                        
                        if (objuserinfo.inbinfo[channel.id].socketid == '') {
                            objuserinfo.inbinfo[channel.id].dispo_wk = -1;
                            console.log('With Out Agent');
                            
                            db.updatedisporecinb(objuserinfo.inbinfo[channel.id]).then(function (data) {
                                //get dial infomation for afte dispo
                                console.log('Dispo to DB Inbound update confirmation to success With out Agent');
                                
                                
                                //clean up obj inbound 
                                if (typeof objuserinfo.inbinfo[channel.id] !== 'undefined') {
                                    delete objuserinfo.inbinfo[channel.id]
                                }
                                
                                console.log('After Obj Delete');
                                
                                
                                
                                //destroy inb hang up bridge   
                                bridge.destroy().then(function () { console.log('After Bridge destory Delete'); }).catch(function (err) { console.log('Brdige destroy Err'); });



                            }).catch(function (err) {
                                
                                console.log('!Dispo to DB Inbound update confirmation to  error!');
                                console.log(err)
                                
                                
                                
                                //clean up obj inbound 
                                if (typeof objuserinfo.inbinfo[channel.id] !== 'undefined') {
                                    delete objuserinfo.inbinfo[channel.id]
                                }
                                
                                
                                console.log('After Obj Delete');
                                //destroy inb hang up bridge   
                                bridge.destroy().then(function () { console.log('After Bridge destory Delete'); }).catch(function (err) { console.log('Brdige destroy Err'); });



                            });
                        } else {
                            //with agent 
                            console.log('WITH! Agent');
                            
                            io.to('/#' + objuserinfo.inbinfo[channel.id].socketid).emit('hanguponuser', objuserinfo.inbinfo[channel.id].socketid);
                            console.log('WITH! agent clean up');
                            
                            
                            //clean up obj inbound 
                            if (typeof objuserinfo.inbinfo[channel.id] !== 'undefined') {
                                delete objuserinfo.inbinfo[channel.id]
                            }
                            //destroy inb hang up bridge   
                            bridge.destroy().then(function () { }).catch(function (err) { console.log('Brdige destroy Err'); });
                    
                        };

                    };
      
                });
                
                return bridge.create({ type: 'mixing' }).then(function (bridge) { return bridge }).catch(function (err) { console.log('create Bridge error'); });

            }).then(function (bridge) {
                
                objuserinfo.inbinfo[incoming_channel.id].bridge_id = bridge.id
                
                return bridge.addChannel({ channel: incoming_channel.id }).then(function () {
                    
                    return incoming_channel.play({ media: objuserinfo.inbinfo[incoming_channel.id].intro_audio }).then(function (playback) {
                        return playback;
                    }).catch(function (err) { console.log('please hold play Err'); });

                });
            }).then(function (playback) {
                
                
                playback.once('PlaybackFinished', function (event, playback) {
                    
                    
                    incoming_channel.play({ media: objuserinfo.inbinfo[incoming_channel.id].hold_audio, playbackId: incoming_channel.id }).then(function (playback) {
                        
                        
                        // make channel obj ready for call and stop play back 
                        objuserinfo.inbinfo[incoming_channel.id].ready = 1;
                        
                        console.log('Play Back : Hold on for one more day')
                    }).catch(function (err) { console.log('hold on play error'); });
            
                });
        

            }).catch(function (err) { console.log('Main Inbound Error'); console.log(err); });
         
        
        
        });
        


    };
    //ENd Inbound test
    
    
    client.on('StasisStart', stasisStart);
    client.on('StasisEnd', stasisEnd);
    // client.on('StasisEnd', stasisendinbhandler);
    
    client.on('ChannelEnteredBridge', channelEnteredBridge);
    client.on('ChannelLeftBridge', channelLeftBridge);
    
    client.start('hello-world');

};

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function yahooSearch(consumerKey, consumerSecret, query, count, callback_error_data_response) {
    var webSearchUrl = 'https://query.yahooapis.com/v1/public/yql';
    var finalUrl = webSearchUrl + '?q=' + encodeURIComponent(query) + '&format=json'
    var oa = new OAuth(webSearchUrl, webSearchUrl, consumerKey, consumerSecret, "1.0", null, "HMAC-SHA1");
    oa.setClientOptions({ requestTokenHttpMethod: 'GET' });
    oa.getProtectedResource(finalUrl, "GET", '', '', callback_error_data_response);
};

function ysql_search_pull(pulltype, zip, socketid) {
    
    
    
    var sockid = socketid;
    
    
    // console.log(sockid);
    
    if (pulltype == 0) {
        
        yahooSearch('4ec400d36092c47fed6cea21431c215aa8b90b26', '4ec400d36092c47fed6cea21431c215aa8b90b26', 'select * from rss(0,8) where url="http://rss.news.yahoo.com/rss/us"', 10, function (error, data, response) {
            // socket.emit('yqlnews', JSON.parse(data).query.results.item[0].text.content);
            
            if (IsJsonString(data)) {
                var resultsus = JSON.parse(data).query.results.item[0].text.content
                if (typeof resultsus === "undefined") {
                    
              

                } else {
                    io.to(socketid).emit('regnews', JSON.parse(data).query.results.item);

                }
            }
        
       // console.log(JSON.parse(data));
        });
    } else {
        
        
        
        yahooSearch('4ec400d36092c47fed6cea21431c215aa8b90b26', '4ec400d36092c47fed6cea21431c215aa8b90b26', 'select * from weather.forecast(0,1)  where woeid in (select woeid from geo.places where placetype="Zip" AND text="' + zip + '" )', 10, function (error, data, response) {
        
            /*
            if (IsJsonString(data)) {
                var resultweath = JSON.parse(data).query.results.channel.item;
                
                //console.log('weather in prod' + sockid);
                
                if (resultweath === "undefined") {
                    
                    console.log('error on yahoo weather pull');

                } else {
                    
                    htmlysql = JSON.parse(data).query.results.channel.item;
                    
                    
                    //console.log(JSON.parse(data).query.results.channel.item.description);
                    
                    var f = JSON.parse(data).query.results.channel.item.forecast;
                    var u = JSON.parse(data).query.results.channel.units.temperature;
                    var title = JSON.parse(data).query.results.channel.item.title;
                    var condition = JSON.parse(data).query.results.channel.item.condition;
                    
                    
                    
                    io.to(sockid).emit('yql', f, u, title, condition);
                    io.to(sockid).emit('yqlhtml', JSON.parse(data).query.results.channel.item.description);
                }
            }
            */


        });
    }
    
}

function givedialrecback(contact_wk, socketid) {
    
    
    objuserinfo.dialinfo[socketid] = [];
    
    db.givedialrecdb(contact_wk).then(function (data) {
        
        console.log('gave back dial rec' + data);
        io.to(socketid).emit('flashsrvmsg', 'Record Return', 'Record ' + contact_wk + ' back to skill', 'assets/ico/png/smartphone-with-reload-arrows.png' , 'red')
        

    }).catch(function (err) {
        
        console.log('err on give back dial reco' + err);

    })


}

function clearmainsocketobj(socketidin) {
    
    
    
    objuserinfo.conuserinfo_main[socketidin].bridge = '';
    objuserinfo.conuserinfo_main[socketidin].current_att_phone = '';
    objuserinfo.conuserinfo_main[socketidin].current_att_dnis = '';
    objuserinfo.conuserinfo_main[socketidin].skill_name = '';
    objuserinfo.conuserinfo_main[socketidin].current_att_wk = 0;
    objuserinfo.conuserinfo_main[socketidin].chanout = '';
    objuserinfo.conuserinfo_main[socketidin].lastdialtime = '';
    objuserinfo.conuserinfo_main[socketidin].current_contact_type = ''
   
}

function getdialrec_main(socketidin) {
    
    
    objuserinfo.conuserinfo_main[socketidin].agentstatus = 'preview';
    
    
    console.log('Getting dial record' + socketidin);
    io.to(socketidin).emit('flashsrvmsg', 'Get Record', 'Pull dial record', 'assets/ico/png/phone-book.png', 'green');
    //test
    //get call information 
    db.getdialrec('3', socketidin)
        .then(function (data) {
        
        objuserinfo.dialinfo[socketidin] = [];
        
        console.log('pull new dial record query data')
        console.log(data);
        
        objuserinfo.conuserinfo_main[socketidin].current_contact_type = 'SCO';
        
        
        
        //push call info to screen  
        io.to(socketidin).emit('callinfo', data, objuserinfo.conuserinfo_main[socketidin]);
        
        ysql_search_pull(1, data.contact_zip, socketidin);
        
        
        
        newsdatapull(socketidin, data.contact_zip);
        
        objuserinfo.dialinfo[socketidin].push(data);
 
        
       // console.log(objuserinfo.dialinfo[socketidin][0].sc_msg_path);
           


    }).catch(function (err) {
        objuserinfo.conuserinfo_main[socketidin].agentstatus = 'Available';
        
        console.log(err);
        
        
        console.log('NO records err');
        console.log(objuserinfo.conuserinfo_main[socketidin].agentstatus);
        io.to(socketidin).emit('callinfo', 0);
    });
    
    
       
   

}

function updatedisplay(updateinfo, typeupdate, callback) {
    
    
    if (typeupdate == 'c_ct') {
        
        
        
        objuserinfo.conuserinfo_main[updateinfo].c_ct += 1;
    } else if (typeupdate == 'smc_ct') {
        
        
        objuserinfo.conuserinfo_main[updateinfo].smc_ct += 1;
    } else if (typeupdate == 'la_ct') {
        
        objuserinfo.conuserinfo_main[updateinfo].la_ct += 1;
    }
    
    
    
    
    callback('giving this back after update' + typeupdate + updateinfo);

}

//reporrrs updates
function rsstoxml(url, done) {
    
    
    return request(url, function (error, resp, body) {
        
        var opts;
        opts = {
            siteTags: ['title', 'description', 'date', 'link', 'author'],
            itemTags: ['title', 'description', 'summary', 'date', 'link', 'author', 'media:content', 'media:description', 'image', 'meta', 'enclosures' , 'categories', 'permalink', 'link']
        };
        
        
        return parser(body, opts, function (error, ret) {
            //  console.log(error);
            return done(ret);
        });
    });
    
    

    

}

//RSS news datafeed pull
function  newsdatapull(socketidin , zip) {
    
    
    rsstoxml('https://rss.nytimes.com/services/xml/rss/nyt/US.xml', function (data) {
        
        var datanews1 = data.items;
        
        
        rsstoxml('https://rss.nytimes.com/services/xml/rss/nyt/World.xml', function (data) {
            
            var datanews2 = data.items;
            
            
            rsstoxml('https://news.google.com/news/section?geo=' + zip + '&output=rss', function (data) {
                
                
                var datanews3 = data.items;
                
                //    console.log(datanews3);
                
                console.log('call back rss');
                io.to(socketidin).emit('yqlnews', datanews3, datanews2, datanews1);
              
            
       
            });
            
        });
            
 
    });
}


function sendinbagcall(channelid, client) {
    
    
    
    //search for agents to answer 
    for (var key in objuserinfo.conuserinfo_main) {
        
        
        
        
        if (typeof objuserinfo.inbinfo[channelid] !== "undefined") {
            
            //important logic check for skill agent send inbound call 
            if ((objuserinfo.conuserinfo_main[key].agentstatus == 'Available') && (objuserinfo.conuserinfo_main[key].skills_wks.split('|').indexOf(objuserinfo.inbinfo[channelid].skill_wk.toString()) > -1) && objuserinfo.inbinfo[channelid].ready == 1) {
                
                //stop on hold playback to send to agent 
                client.playbacks.stop({
                    playbackId: channelid
                })
            .then(function () { console.log('stop hold on play back'); })
            .catch(function (err) {
                    console.log('playback err hold stop');
                });
                
                console.log('chan to bridge inbound' + objuserinfo.conuserinfo_main[key].chan);
                
                objuserinfo.inbinfo[channelid].currentagchan = objuserinfo.conuserinfo_main[key].chan;
                objuserinfo.inbinfo[channelid].socketid = objuserinfo.conuserinfo_main[key].useridsock;
                objuserinfo.inbinfo[channelid].online_user_wk = objuserinfo.conuserinfo_main[key].online_user_wk;
                objuserinfo.conuserinfo_main[key].dispo_db_display = objuserinfo.inbinfo[channelid].dispos;
                objuserinfo.conuserinfo_main[key].agentstatus = 'inb';
                objuserinfo.conuserinfo_main[key].current_contact_type = 'SCI'
                objuserinfo.conuserinfo_main[key].bridge = objuserinfo.inbinfo[channelid].bridge_id;
                objuserinfo.conuserinfo_main[key].current_att_phone = objuserinfo.inbinfo[channelid].ani;  //channel.caller.number;
                objuserinfo.conuserinfo_main[key].current_att_dnis = objuserinfo.inbinfo[channelid].did;
                objuserinfo.conuserinfo_main[key].skill_name = objuserinfo.inbinfo[channelid].skill_name;
                objuserinfo.conuserinfo_main[key].current_att_wk = objuserinfo.inbinfo[channelid].att_wk;
                objuserinfo.conuserinfo_main[key].chanout = channelid;
                
                //inbound survey put            
                objuserinfo.conuserinfo_main[key].survey = objuserinfo.inbinfo[channelid].survey
                objuserinfo.conuserinfo_main[key].surveyqa = objuserinfo.inbinfo[channelid].surveyqa
                objuserinfo.conuserinfo_main[key].surveyans = objuserinfo.inbinfo[channelid].surveyans
                
                updatedisplay(key, 'c_ct', function (infoback) {
                    io.to(key).emit('agentdisplayinfo', objuserinfo.conuserinfo_main[key]);
                });
                
                
                
                
                //bridge to channel on pass to agent 
                
                client.bridges.addChannel({ bridgeId: objuserinfo.inbinfo[channelid].bridge_id, channel: objuserinfo.conuserinfo_main[key].chan }).then(function (bridge) { console.log('add to bridge'); }).catch(function (err) { console.log('add bridge agent error'); console.log(err); });
                
                
                //send inbound call msg to brower
                io.to(key).emit('flashsrvmsg', 'Inbound Call', 'Inbound Call Received', 'assets/ico/png/phone-book.png', 'green');
                
                
                //send inbound call msg to brower
                io.to(key).emit('inbcall', objuserinfo.inbinfo[channelid].did, objuserinfo.conuserinfo_main[key], objuserinfo.inbinfo[channelid].callerinfo_acd);
                
                
                db.updatedisporecinb(objuserinfo.inbinfo[channelid]).then(function (data) {
                    //get dial infomation for afte dispo
                    
                    console.log('Dispo to DB update confirmation to success ******');
                    
                    io.to(key).emit('flashsrvmsg', 'Successful Disposition', 'User Record Update', 'assets/ico/png/finger-touching-tablet-screen.png', 'green');
                    
                    
                    //tes withinside done
                    
                    if (typeof objuserinfo.inbinfo[channelid] !== "undefined") {
                        client.channels.play({ channelId: objuserinfo.conuserinfo_main[key].chan, media: objuserinfo.inbinfo[channelid].whisper_audio },
                                                 function (playback) { console.log('Play after whisper'); }).then(function (playback) { }).catch(function (err) { console.log('agent whisper err') });
                    }

                            
                }).catch(function (err) {
                    console.log('Update dispo error');
                });
                
                
                break;
        
            } else {
                
                
                console.log('NO AGENT AVAIL INFUN : ' + moment().format());
            }
        }
    }
}



//IVR outbound menu  test menu 
client_ari_ivr.connect('http://devacd.datapex.com:8088', 'screstuser', '960f643cb2ab2467bc24366bcb7703eb', IVRclientLoadedv2test).then(function (client_ari_ivr) {
    
    console.log('IVR menu ARI connect');

   /*

        var fileNameList = 
           ['/var/lib/asterisk/sounds/en/custom/intro_msg1.wav', 
        '/var/lib/asterisk/sounds/en/custom/intro_msg3.wav',
        '/var/lib/asterisk/sounds/en/custom/record_key_1.wav',
        '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_1.wav',
        '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_2.wav',
        '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_3.wav',
        '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_4.wav',
        '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_5.wav',
        '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_6.wav',
        '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_7.wav'
       ];
        
        

        

     
    //tets back to back audio test 
    var current_playback;
    var sounds_to_play;
    var playback;
    current_playback = 0;
    sounds_to_play = [
        {
            'playback': client_ari_ivr.Playback(),
            'media': 'sound:custom/intro_msg1'
        },
        {
            'playback': client_ari_ivr.Playback(),
            'media': 'sound:custom/intro_msg3'
        },
        {
            'playback': client_ari_ivr.Playback(),
            'media': 'sound:custom/record_key_1'
        },
        {
            'playback': client_ari_ivr.Playback(),
            'media': 'sound:custom/record_msg_prompt_1'
        },
        {
            'playback': client_ari_ivr.Playback(),
            'media': 'sound:custom/record_msg_prompt_2'
        },
        {
            'playback': client_ari_ivr.Playback(),
            'media': 'sound:custom/record_msg_prompt_3'
        },
        {
            'playback': client_ari_ivr.Playback(),
            'media': 'sound:custom/record_msg_prompt_4'
        },
        {
            'playback': client_ari_ivr.Playback(),
            'media': 'sound:custom/record_msg_prompt_5'
        },
        {
            'playback': client_ari_ivr.Playback(),
            'media': 'sound:custom/record_msg_prompt_6'
        },
        {
            'playback': client_ari_ivr.Playback(),
            'media': 'sound:custom/record_msg_prompt_7'
        }
    ];
    
    
    function on_playback_finished(event) {
        var current_sound = sounds_to_play[current_playback];
        if (playback && (playback.id === event.playback.id)) {
            playback = null;
            current_playback++;
            if (current_playback === sounds_to_play.length) {
              cleanup();
            } else {
                start_playback();
            }
        }
    }
    
    function start_playback() {
        current_sound = sounds_to_play[current_playback];
        playback = current_sound['playback'];
        channeloutivrtest.play({ media: current_sound['media'] }, playback).then(function (playback) { 
            playback.once('PlaybackFinished', on_playback_finished);
        });
    }
    
    function cleanup() {
        if (playback) {
            playback.stop();

            console.log('playback stop');

        }
    }
    
    var indexplay = 0
    var channeloutivrtest = client_ari_ivr.Channel();
   
    
   
 
    
    channeloutivrtest.once('StasisStart', function (event, channel) {
            //start_playback();

        channeloutivrtest.play({ media: 'recording:testintroconcat' }, playback).then(function (playback) {

            console.log('playback on start');
           
        });
    });
    
    
    

    
    
    channeloutivrtest.originate({ endpoint: 'SIP/' + '5287389267GW1' + '/1' + '3865473629', app: 'smivroutz', appArgs: 'dialed', callerId: '3862710666', "variables": { } }).then(function (channel) {});
    
    concat_audio_func(fileNameList, "/var/spool/asterisk/recording/" + 'testintroconcat' + ".wav");
   */

  

}).then(function (err) { });




// handler for IVR ARI client being loaded
function IVRclientLoadedv2test(err, ari_ivr) {
    
    
    
    ari_ivr.start('smivroutz');
    
    io.on('connection', function (socket) {
        
        socket.on('call_ivr_hangup', function (channelin) {
            
            
            ari_ivr.channels.hangup({
                channelId: channelin
            })
                  .then(function () {
                console.log('Hang up on IVR');

            
            })
                  .catch(function (err) { });

        });
        
        
        
        
        
        
        socket.on('load_audio', function (job_num, fn) {
            
            
            var audio_job_arr_obj = [];
            
            
            
            ari_ivr.recordings.listStored().then(function (storedrecordings) {
                
                
                
                storedrecordings.forEach(function (rec_file, idx) {
                    
                    console.log('Recording for each : ' + rec_file.name);
                    
                    if (rec_file.name.startsWith(job_num + '_') == true) {
                        
                        var audio_job_obj = {};
                        
                        audio_job_obj.audioname = rec_file.name;
                        data = fs.readFileSync("/var/spool/asterisk/recording/" + rec_file.name + ".wav");
                        audio_job_obj.encodeb64out = data.toString('base64')
                        
                        audio_job_obj.msg_num = rec_file.name.split("_")[rec_file.name.split("_").length - 1];
                        
                        audio_job_arr_obj.push(audio_job_obj);
                        console.log('Recording : ' + rec_file.name);


                    }

          
                });
                
                fn(audio_job_arr_obj);
        
            });

            
            
            
            
                  

        //console.log(file_name_wav);
        });
        
        
        
        socket.on('call_ivr', function (jobnum_in, campname_in, phonenum_in, fn) {
            
            
            console.log('call testing 2 ivr');
            
            console.log(phonenum_in);
            
            
            
            //new channel for dial out 
            var channeloutivr = ari_ivr.Channel();
            
            var dialoutnum = phonenum_in;
            //'3865473629';
            //3865470958 3865068138
            //'3865470958';
            //3862564181
            
            var ivrsipgway = '5287389267GW1';
            var ivr_msg_recording = ari_ivr.LiveRecording();
            var recordingname = 'test_recording'
            var playbackIVR = ari_ivr.Playback();
            
            var job_name = campname_in;
            var job_num = jobnum_in;
            
            //0 intro
            //1 recording menu
            //2 after record  menu
            //3 play back menu 
            //4 return to intro
            ari_ivr.start('smivrout');
            
            
            
            //test IVR 
            var obj_ivr_play = {};
            obj_ivr_play.intro_ivr_play_current_indx = 0;
            obj_ivr_play.concat_intro = '';

            obj_ivr_play.ivrmenu = 0;
            obj_ivr_play.msg_rec_num = 0;
            obj_ivr_play.msg_rec_max = 9;
            obj_ivr_play.rec_arr = [];
            obj_ivr_play.intro_ivr_play = ["intro_msg1", "b_" , "intro_msg2", "intro_msg3", "record_key_1", "record_msg_prompt_1", "record_msg_prompt_2", "record_msg_prompt_3", "record_msg_prompt_4", "record_msg_prompt_5", "record_msg_prompt_6", "record_msg_prompt_7", "record_msg_prompt_8", "record_msg_prompt_9"];
            var fileNameListintro = 
            [
                {
                    'file': '/var/lib/asterisk/sounds/en/custom/intro_msg1.wav', 
                    'varname': 'a'
                }, 
               
                {
                    'file': '/var/lib/asterisk/sounds/en/custom/b_', 
                    'varname': 'c' 
                }, 
                {
                    'file': '/var/lib/asterisk/sounds/en/custom/intro_msg2.wav', 
                    'varname': 'c'
                }, 
                
                {
                    'file': '/var/lib/asterisk/sounds/en/custom/intro_msg3.wav', 
                    'varname': 'd'
                }, 

                {
                    'file': '/var/lib/asterisk/sounds/en/custom/msg_word.wav', 
                    'varname': 'e'
                }
            ];

            
            var fileNameListintro_tolisten = 
            [
            {
            'file': '/var/lib/asterisk/sounds/en/custom/to_listen_1.wav', 
            'varname': 'a'
            }, 
            {
            'file': '/var/lib/asterisk/sounds/en/custom/b_', 
            'varname': 'b' 
            }, 
            {
            'file': '/var/lib/asterisk/sounds/en/custom/after_rec_2.wav', 
            'varname': 'c'
            }];
            
            
            
            


            obj_ivr_play.current_msg_rec_edit = 0;
            obj_ivr_play.last_good_dtmf = 0;
            obj_ivr_play.rec_yn = 0;
            
            obj_ivr_play.rec_type = 'overwrite';
            //get job record info
            function getjobinfo_ivr(job_num, job_name, callback) {
                
                var recarray = [];
                
                
                ari_ivr.recordings.listStored().then(function (storedrecordings) {
                    
                    
                    
                    storedrecordings.forEach(function (rec_file, idx) {
                        if (rec_file.name.indexOf(job_num + '_' + job_name.replace(' ', '_')) >= 0) {
                            
                            
                            recarray.push(rec_file.name);
                            console.log('Recording : ' + rec_file.name);

                        }

          
                    });
                    
                    
                    obj_ivr_play.rec_arr = recarray;
                    obj_ivr_play.msg_rec_num = recarray.length;
                    
                 
                    if (recarray.length == 0) {
                        fileNameListintro[1].file = fileNameListintro[1].file + obj_ivr_play.msg_rec_max + '.wav'
                        fileNameListintro[1].varname = fileNameListintro[1].varname + '_' +  obj_ivr_play.msg_rec_max 
                        fileNameListintro.splice(4, 1);
                    } else {
                        fileNameListintro[1].file = fileNameListintro[1].file + obj_ivr_play.msg_rec_max + '.wav'
                         fileNameListintro[1].varname = fileNameListintro[1].varname + '_' +  obj_ivr_play.msg_rec_max 
                        fileNameListintro.splice(3,1);
                    }
                    
               
             
                    
                    
                    
                    
                            
                  //  console.log(fileNameListintro);
                    
                    //add for variable message read out for job that has messages recorded 
                    
                    recarray.forEach(function (rec_file, idx) {
                        //push for the and on the last already recorded msgs
                        if (idx + 1 == recarray.length) {
                            
                            if (recarray.length == 1) {
                         

                                fileNameListintro.push(
                                {
                                    'file': '/var/lib/asterisk/sounds/en/custom/' + 'b_' + rec_file.substring(rec_file.length - 1 , rec_file.length) + '.wav', 
                                    'varname': 'f_' + rec_file.substring(rec_file.length - 1 , rec_file.length)
                                },
                                {
                                        'file': '/var/lib/asterisk/sounds/en/custom/msg_have_been_4.wav', 
                                        'varname': 'g'
                                });

                   
                            } else {
                                
                             
                                fileNameListintro.push(
                                    {
                                        'file': '/var/lib/asterisk/sounds/en/custom/msg_have_been_3_and.wav', 
                                        'varname': 'h'
                                    },
                                    {
                                        'file': '/var/lib/asterisk/sounds/en/custom/' + 'b_' + rec_file.substring(rec_file.length - 1 , rec_file.length) + '.wav', 
                                        'varname': 'i_' + rec_file.substring(rec_file.length - 1 , rec_file.length)
                                    },
                                    {
                                        'file': '/var/lib/asterisk/sounds/en/custom/msg_have_been_4.wav', 
                                        'varname': 'g'
                                    });



                            }
              
                        } else {
                            
                            
                            
                            fileNameListintro.push({
                                'file': '/var/lib/asterisk/sounds/en/custom/' + 'b_' + rec_file.substring(rec_file.length - 1 , rec_file.length) + '.wav', 
                                'varname': 'k_' + rec_file.substring(rec_file.length - 1 , rec_file.length)
                            });
                   
                        }

                    });
                    
                    
                    
              
                    fileNameListintro.push({
                        'file': '/var/lib/asterisk/sounds/en/custom/record_key_1.wav', 
                        'varname': 'l'
                    },
                    {
                        'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_1.wav', 
                        'varname': 'm'
                    },
                    {
                        'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_2.wav', 
                        'varname': 'n'
                    },
                    {
                        'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_3.wav', 
                        'varname': 'o'
                    },
                     {   
                        'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_4.wav', 
                        'varname': 'p'
                    },
                    {
                        'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_5.wav', 
                        'varname': 'q'
                    },
                    {
                        'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_6.wav', 
                        'varname': 'r'
                    },
                    {
                        'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_7.wav', 
                        'varname': 's'
                    },
                    {
                        'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_8.wav', 
                        'varname': 't'
                    },
                    {
                        'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_9.wav', 
                        'varname': 'u'
                    });
   
                    var filename = '';

                    for (var i = 0, len = fileNameListintro.length; i < len; i++) {
                        
                        filename += fileNameListintro[i].varname
                      
                    } 
                 
                    var msgarray = [obj_ivr_play.msg_rec_num, fileNameListintro, 'intro_' + job_num   + '_' + filename + '.wav'];

                    callback(msgarray);

                }).catch(function (err) {
            
      
                });
     
            }
            
            
            
            //dtmf function 
            
            
            
            function ondtmf_sc(event, channel) {
                console.log(event.digit);
                console.log("IVR dtmf event");
                console.log(channel.id);
                
                //sound:custom/recordatendpress_pnd
                //recording:testrecording1
                
                
                
                function stop_playback(dtmfin, callback) {
                    
                    
                    if (dtmfin != '#') {
                        
                        //stop loop playback for intro 
                        obj_ivr_play.intro_ivr_play_current_indx = -1;
                        
                        
                        console.log('stop play back');
                        
                        if (obj_ivr_play.ivrmenu != 1) {
                            playbackIVR.stop(function (err) {
                                
                                
                                
                                
                                
                                if (err) { 
                        //ignore errors
                    
                                }
                                
                                callback();
                            });
                        }


                    } else {
                        callback();
                    }

                }
                
                
                
                
                //get after job info dtmf press
                function getjobinfo_ivr_dtmf(dtmfin, job_num, callback) {
                    
                    var filename = '';
                    fileNameListintro_tolisten[1].file = fileNameListintro_tolisten[1].file + dtmfin + '.wav';
                    fileNameListintro_tolisten[1].varname = fileNameListintro_tolisten[1].varname + '_' + dtmfin;
                    
                    for (var i = 0, len = fileNameListintro_tolisten.length; i < len; i++) {
                        filename += fileNameListintro_tolisten[i].varname;
                    }
                    
                    
                    fs.stat('/var/lib/asterisk/sounds/en/custom/' + 'dtmf_' + job_num + '_' + filename + '.wav', function (err, stat) {
                        if (err == null) {
                            console.log('File exists');
                            
                            callback('dtmf_' + job_num + '_' + filename);
                        } else if (err.code == 'ENOENT') {
                            
                            console.log('no  file')
                            concat_audio_func_arr(fileNameListintro_tolisten, '/var/lib/asterisk/sounds/en/custom/' + 'dtmf_' + job_num + '_' + filename + '.wav');
                            
                            callback('dtmf_' + job_num + '_' + filename);
                        } else {
                            console.log('Some other error: ', err.code);


                        }
                    });


               

                }
            
                
                
                
                
                
                
                function dtmfhandle(digit_dtmf, skipcheck) {
                    
                    
                    var reckey = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
                    var reckeyafter = ['1', '2', '3', '0'];
                    
                    if (digit_dtmf == 0 && obj_ivr_play.ivrmenu == 4) {
                        //intro 
                        obj_ivr_play.ivrmenu = 0;
                        
                        
                        obj_ivr_play.last_good_dtmf = digit_dtmf;
                        
                        
                        getjobinfo_ivr(job_num, job_name, function (msg_arr) {
                            
                            console.log(msg_arr[0]);
                            console.log(msg_arr[1]);
                            
                            
                            obj_ivr_play.concat_intro = msg_arr[2];
                            
                            
                            fs.stat('/var/lib/asterisk/sounds/en/custom/' + obj_ivr_play.concat_intro, function (err, stat) {
                                if (err == null) {
                                    console.log('File exists');
                                } else if (err.code == 'ENOENT') {
                                    
                                    console.log('no  file')
                                    concat_audio_func_arr(msg_arr[1], '/var/lib/asterisk/sounds/en/custom/' + msg_arr[2]);
                                } else {
                                    console.log('Some other error: ', err.code);
                                }
                            });



                            obj_ivr_play.intro_ivr_play_current_indx = 0;
                            console.log('getting ready already rec ' + obj_ivr_play.concat_intro);
                            
                            
                            obj_ivr_play.ivrmenu = 0;
                            
                            
                            
                            
                            
                            
                            channel.play({ media: 'sound:custom/' + obj_ivr_play.concat_intro}, playbackIVR).then(function (playback) {



                            }).catch(function (err) {
                                obj_ivr_play.intro_ivr_play_current_indx = -1;
                                
                                console.log(err);

                                console.log('Error Playback ivr');
                            });


    
                        });
    




                    } else if (reckey.indexOf(digit_dtmf) >= 0 && obj_ivr_play.ivrmenu == 0) {
                        
                        obj_ivr_play.last_good_dtmf = digit_dtmf;
                        //recording success yes no
                        obj_ivr_play.rec_yn = 0;
                        
                        obj_ivr_play.ivrmenu = 1;
                        obj_ivr_play.current_msg_rec_edit = digit_dtmf;
                        
                        //recording 
                        
                        
                        
                        if (obj_ivr_play.rec_arr.indexOf(job_num + '_' + job_name.replace(' ', '_') + "_" + digit_dtmf) >= 0 && skipcheck == 0) {
                            
                            
                            obj_ivr_play.ivrmenu = 1;
                            obj_ivr_play.rec_yn = 1;
                            obj_ivr_play.rec_type = 'overwrite';
                            obj_ivr_play.current_msg_rec_edit = digit_dtmf;
                            
                            dtmfhandle('#', 0);


                        } else {
                            
                            
                            
                            
                            channel.play({ media: "sound:custom/recstart_b" }, playbackIVR).then(function (playback) {
                                console.log('Play Back IVR : recordatendpress_pnd')
                                
                                
                                playback.once('PlaybackFinished', function (event, playback) {
                                    //record audio   
                                    ari_ivr.channels.record({
                                        channelId: channel.id,
                                        format: 'wav',
                                        name: job_num + '_' + job_name.replace(' ', '_') + "_" + digit_dtmf,
                                        ifExists: obj_ivr_play.rec_type,
                                        beep: true,
                                        terminateOn : '#',
                                        maxSilenceSeconds : 10

                                    })
                      .then(function (ivr_msg_recording) {
                                        console.log('succsess record');
                                        obj_ivr_play.rec_yn = 1;
                                        obj_ivr_play.rec_type = 'overwrite';
                                        
                                        
                                        // trim audio after record 1 sec on each end 
                                        ivr_msg_recording.once('RecordingFinished', function (event, recording) {
                                            
                                            
                                            if (parseInt(event.recording.duration) > 4) {
                                                trimaudio_func('/var/spool/asterisk/recording/' + job_num + '_' + job_name.replace(' ', '_') + "_" + digit_dtmf, 1, parseInt(event.recording.duration) - 1);
                                            }

                                        });

                        
                                    })
                      .catch(function (err) {
                                        
                                        obj_ivr_play.rec_yn = 0;
                                        obj_ivr_play.rec_type = 'overwrite';
                                        console.log(err);
                                        console.log('recordingerror')
                                    });
            
                                });

                            }).catch(function (err) { console.log('Error Playback ivr recordatendpress_pnd'); });

                        }


                    } else if (digit_dtmf == '#' && obj_ivr_play.ivrmenu == 1 && obj_ivr_play.rec_yn == 1) {
                        obj_ivr_play.last_good_dtmf = digit_dtmf;
                        
                        obj_ivr_play.rec_yn = 0;
                        obj_ivr_play.ivrmenu = 2;
                        

                        
                      




                        getjobinfo_ivr_dtmf(obj_ivr_play.current_msg_rec_edit, job_num  , function (varback) {
                            
                            console.log('playfile');

                    
                            channel.play({ media: 'sound:custom/' + varback}, playbackIVR).then(function (playback) {
               
                            }).catch(function (err) { console.log(err); console.log('Listen 1 error'); });
                        
                        
                        })





                        /*
                        channel.play({ media: "sound:custom/to_listen_1", skipms: 0 }, playbackIVR).then(function (playback) {
                            
                            console.log('to listen play');
                            
                            
                            playback.once('PlaybackFinished', function (event, playback) {
                                
                                channel.play({ media: "sound:custom/b_" + obj_ivr_play.current_msg_rec_edit}, playbackIVR).then(function (playback) {
                                    
                                    
                                    playback.once('PlaybackFinished', function (event, playback) {
                                        
                                        channel.play({ media: "sound:custom/after_rec_2"}, playbackIVR).then(function (playback) { }).catch(function (err) { console.log('Error Playback ivr listen or recrecord'); });

                                    });
                        
                            
                                }).catch(function (err) { console.log('sound play back 1 error'); });
                    
                            });


                
                        }).catch(function (err) { console.log(err); console.log('Listen 1 error'); });
                        */
                
                
                    } else if (obj_ivr_play.ivrmenu == 3) {
                        //listen menu 
                        
                        
                        
                        
                        
                        channeloutivr.removeListener('ChannelDtmfReceived', ondtmf_sc);
                        
                        channel.play({ media: 'recording:' + job_num + '_' + job_name.replace(' ', '_') + "_" + digit_dtmf }, playbackIVR).then(function (playback) {
                            
                            
                            
                            
                            
                            playback.once('PlaybackFinished', function (event, playback) {
                                obj_ivr_play.rec_yn = 1;
                                
                                obj_ivr_play.ivrmenu = 1;
                                
                                
                                obj_ivr_play.intro_ivr_play_current_indx = -1;
                                
                                
                                dtmfhandle('#', 0);
                                
                                channeloutivr.on('ChannelDtmfReceived', ondtmf_sc);

                            });
                        }).catch(function (err) { console.log('Error Playback ivr Playback audio'); });

            
            
            
                    } else if (reckeyafter.indexOf(digit_dtmf) >= 0 && obj_ivr_play.ivrmenu == 2) {
                        
                        obj_ivr_play.last_good_dtmf = digit_dtmf;
                        
                        if (digit_dtmf == 1) {
                            obj_ivr_play.ivrmenu = 3;
                            dtmfhandle(obj_ivr_play.current_msg_rec_edit, 0);

                        } else if (digit_dtmf == 2) {
                            
                            
                            
                            obj_ivr_play.ivrmenu = 0;
                            obj_ivr_play.rec_type = 'overwrite';
                            
                            dtmfhandle(obj_ivr_play.current_msg_rec_edit, 1);
                    
                        } else if (digit_dtmf == 3) {
                            
                            obj_ivr_play.ivrmenu = 0;
                            obj_ivr_play.rec_type = 'append';
                            dtmfhandle(obj_ivr_play.current_msg_rec_edit, 1);


                    //append

                        } else if (digit_dtmf == 0) {
                            
                            
                            //back to intro 
                            
                            obj_ivr_play.ivrmenu = 4;
                            dtmfhandle(0, 0);
                        }


                    } else if (obj_ivr_play.ivrmenu != 1) {
                        
                        
                        console.log(obj_ivr_play.last_good_dtmf);
                        channeloutivr.removeListener('ChannelDtmfReceived', ondtmf_sc);
                        
                        stop_playback(666, function () {
                            
                            channel.play({ media: "sound:custom/invaildresp" , skipms: 0 }, playbackIVR).then(function (playback) {
                                
                                
                                console.log('hang up ivr');
                                
                                playback.once('PlaybackFinished', function (event, playback) {
                                    
                                    
                                    if (obj_ivr_play.last_good_dtmf == '0') {
                                        
                                        obj_ivr_play.ivrmenu = 4;

                                    } else if (obj_ivr_play.last_good_dtmf == '#') {
                                        
                                        
                                        obj_ivr_play.rec_yn = 1;
                                        obj_ivr_play.ivrmenu = 1;
                                    }
                                    
                                    
                                    
                                    
                                    dtmfhandle(obj_ivr_play.last_good_dtmf, 0);
                                    
                                    channeloutivr.on('ChannelDtmfReceived', ondtmf_sc);
    
                
                                });
            
                            }).catch(function (err) { console.log('INvaild response Playback ivr'); });
                        });


                    }
    
                }
                
                
                
                var vaildkey = ['#', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
                
                
                if (vaildkey.indexOf(event.digit) >= 0) {
                    
                    console.log('vaild key');
                    stop_playback(event.digit, function () {
                        console.log(event.digit);
                        dtmfhandle(event.digit, 0);
                    })
                }
        

     

            
            }
            
            
            channeloutivr.on('ChannelDtmfReceived', ondtmf_sc);
            
            
            
            
            //Main play back finished loop event. 
            
           // playbackIVR.on("PlaybackFinished", on_playback_finished);
            
            function on_playback_finished(event) {
                console.log(obj_ivr_play.intro_ivr_play_current_indx)
                
                
                
                
                
                if (obj_ivr_play.intro_ivr_play_current_indx < obj_ivr_play.intro_ivr_play.length - 1 && obj_ivr_play.intro_ivr_play_current_indx != -1) {
                    
                    obj_ivr_play.intro_ivr_play_current_indx += 1;
                    
                    console.log('Playing file : ' + obj_ivr_play.intro_ivr_play[obj_ivr_play.intro_ivr_play_current_indx]);
                    
                    
                    
                    
                    channeloutivr.play({ media: 'sound:custom/' + obj_ivr_play.intro_ivr_play[obj_ivr_play.intro_ivr_play_current_indx] }, playbackIVR).then(function (playback) {

                    }).catch(function (err) {
                        
                        obj_ivr_play.intro_ivr_play_current_indx = -1;
                        console.log('Error Playback ivr');
                    });
                








                }

            }
            
         
            channeloutivr.on('ChannelDestroyed', function (event, channel) {
                
                
                socket.emit('ivr_status_msg', '<span class="text-danger">Hung Up</span>');
                console.log('ChannelDestroyed');
                socket.emit('ChannelDestroyed_ivr', channel.id);


            });
            
         
            
            
            
            
            
            
            console.log('on top of the dial out');

           // channeloutivr.originate({ endpoint: 'SIP/' + ivrsipgway + '/1' + '3865473629', app: 'smivrout', appArgs: 'dialed', callerId: '3862710666', "variables": { 'userobj': "Alice" } }).then(function (channel) { fn(channel.id);});

            
      

            //dial out procedure test
            getjobinfo_ivr(job_num, job_name, function (msg_arr) {
                
               // console.log('getting ready already rec' + msg_arr[0]);
                console.log(msg_arr[2]);
                console.log(msg_arr[0]);
                console.log(msg_arr[1]); 
                
                
             obj_ivr_play.concat_intro = msg_arr[2];


                fs.stat('/var/lib/asterisk/sounds/en/custom/' + obj_ivr_play.concat_intro, function (err, stat) {
                    if (err == null) {
                        console.log('File exists');
                    } else if (err.code == 'ENOENT') {
                        
                        console.log('no  file')
                        concat_audio_func_arr(msg_arr[1], '/var/lib/asterisk/sounds/en/custom/' + msg_arr[2]);
                    } else {
                        console.log('Some other error: ', err.code);
                    }
                });

                
              

                console.log('in job info call');
             
             channeloutivr.originate({ endpoint: 'SIP/' + ivrsipgway + '/1' + dialoutnum, app: 'smivrout', appArgs: 'dialed', callerId: '3862710666', "variables": { 'userobj': "Alice" } }).then(function (channel) {
                    
                    fn(channel.id);
                    
                    channel.once('ChannelStateChange', function (event, channel) {
                        console.log(event);

                   });
                    
                    
                    
                    //intro 
                    channeloutivr.on('StasisStart', function (event, channel) {
                        
                        console.log('StasisStart')
                        socket.emit('ivr_status_msg', '<span class="text-success">In IVR</span>');
                        obj_ivr_play.ivrmenu = 0;
                        
                        console.log('Playing file' + msg_arr[2].replace('.wav', ''));
                        
                        channel.play({ media: 'sound:custom/' + msg_arr[2].replace('.wav','') }, playbackIVR).then(function (playback) {

                        }).catch(function (err) {
                            obj_ivr_play.intro_ivr_play_current_indx = -1;
                            
                            console.log('Error Playback ivr');
                        });

                    });
                    
                    

                    //start of IVR pick up 
                  
            
                   socket.emit('ivr_status_msg', '<span class="text-warning">Dialing Out</span>');
                  
               });
               
    
            });
    


        });
    });

    
   

};



// handler for IVR ARI client being loaded
function IVRclientLoaded(err, ari_ivr) {
    
    
    io.on('connection', function (socket) {
        
        socket.on('call_ivr_hangup', function (channelin) {
            
            
            ari_ivr.channels.hangup({
                channelId: channelin
            })
                  .then(function () {
                console.log('Hang up on IVR');

            
            })
                  .catch(function (err) { });

        });
        
        
        
        
        
        
        socket.on('load_audio', function (job_num, fn) {
            
            
            var audio_job_arr_obj = [];
            
            
            
            ari_ivr.recordings.listStored().then(function (storedrecordings) {
                
                
                
                storedrecordings.forEach(function (rec_file, idx) {
                    
                    console.log('Recording for each : ' + rec_file.name);
                    
                    if (rec_file.name.startsWith(job_num + '_') == true) {
                        
                        var audio_job_obj = {};
                        
                        audio_job_obj.audioname = rec_file.name;
                        data = fs.readFileSync("/var/spool/asterisk/recording/" + rec_file.name + ".wav");
                        audio_job_obj.encodeb64out = data.toString('base64')
                        
                        audio_job_obj.msg_num = rec_file.name.split("_")[rec_file.name.split("_").length - 1];
                        
                        audio_job_arr_obj.push(audio_job_obj);
                        console.log('Recording : ' + rec_file.name);


                    }

          
                });
                
                fn(audio_job_arr_obj);
        
            });

            
            
            
            
                  

        //console.log(file_name_wav);
        });
        
        
        
        socket.on('call_ivr', function (jobnum_in, campname_in, phonenum_in, fn) {
            
            
            console.log('calll ivr');
            
            console.log(phonenum_in);
            
            
            
            //new channel for dial out 
            var channeloutivr = ari_ivr.Channel();
              
            var dialoutnum = phonenum_in;
            //'3865473629';
            //3865470958 3865068138
            //'3865470958';
            //3862564181
            
            var ivrsipgway = '5287389267GW1';
            var ivr_msg_recording = ari_ivr.LiveRecording();
            var recordingname = 'test_recording'
            var playbackIVR = ari_ivr.Playback();
   
            var job_name = campname_in;
            var job_num = jobnum_in;
            
            //0 intro
            //1 recording menu
            //2 after record  menu
            //3 play back menu 
            //4 return to intro
            ari_ivr.start('smivrout');
            
            
            
            //test IVR 
            var obj_ivr_play = {};
            obj_ivr_play.intro_ivr_play_current_indx = 0;
            obj_ivr_play.ivrmenu = 0;
            obj_ivr_play.msg_rec_num = 0;
            obj_ivr_play.msg_rec_max = 9;
            obj_ivr_play.rec_arr = [];
            obj_ivr_play.intro_ivr_play = ["intro_msg1", "b_" , "intro_msg2", "intro_msg3", "record_key_1", "record_msg_prompt_1", "record_msg_prompt_2", "record_msg_prompt_3", "record_msg_prompt_4", "record_msg_prompt_5", "record_msg_prompt_6", "record_msg_prompt_7", "record_msg_prompt_8", "record_msg_prompt_9"];
            obj_ivr_play.current_msg_rec_edit = 0;
            obj_ivr_play.last_good_dtmf = 0;
            obj_ivr_play.rec_yn = 0;
            
            obj_ivr_play.rec_type = 'overwrite';
            
            
            
         
            
            

            //get job record info
            function getjobinfo_ivr(job_num, job_name, callback) {
                
                var recarray = [];
                
                
                ari_ivr.recordings.listStored().then(function (storedrecordings) {
                    
                    
                    
                    storedrecordings.forEach(function (rec_file, idx) {
                        if (rec_file.name.indexOf(job_num + '_' + job_name.replace(' ', '_')) >= 0) {
                            
                            
                            recarray.push(rec_file.name);
                            console.log('Recording : ' + rec_file.name);

                        }

          
                    });
                    
                    
                    obj_ivr_play.rec_arr = recarray;
                    obj_ivr_play.msg_rec_num = recarray.length;
                    
                    if (recarray.length == 0) {
                        obj_ivr_play.intro_ivr_play = ["intro_msg1_aft", "b_" + obj_ivr_play.msg_rec_max , "intro_msg2", "intro_msg3"];
                    } else {
                        
                        obj_ivr_play.intro_ivr_play = ["intro_msg1_aft", "b_" + obj_ivr_play.msg_rec_max , "intro_msg2", "msg_word"];

                    }
                    
                    
                    
                    
                    //add for variable message read out for job that has messages recorded 
                    
                    recarray.forEach(function (rec_file, idx) {
                        //push for the and on the last already recorded msgs
                        if (idx + 1 == recarray.length) {
                            
                            
                            if (recarray.length == 1) {
                                
                                obj_ivr_play.intro_ivr_play.push('b_' + rec_file.substring(rec_file.length - 1 , rec_file.length), 'msg_have_been_4');
                   
                            } else {
                                
                                obj_ivr_play.intro_ivr_play.push('msg_have_been_3_and', 'b_' + rec_file.substring(rec_file.length - 1 , rec_file.length), 'msg_have_been_4');
                   

                            }
              
                        } else {
                            
                            obj_ivr_play.intro_ivr_play.push('b_' + rec_file.substring(rec_file.length - 1 , rec_file.length));
                        }

                    });
                    
                    
                    
                    
                    obj_ivr_play.intro_ivr_play.push('record_key_1', 'record_msg_prompt_1', 'record_msg_prompt_2', 'record_msg_prompt_3', 'record_msg_prompt_4', 'record_msg_prompt_5', 'record_msg_prompt_6', 'record_msg_prompt_7', 'record_msg_prompt_8', 'record_msg_prompt_9');
                    
                    console.log(obj_ivr_play.intro_ivr_play);
                    
                    callback(obj_ivr_play.msg_rec_num);


                }).catch(function (err) {
            
      
                });
     
            }
            
            
            
            //dtmf function 
            
            
            
            function ondtmf_sc(event, channel) {
                console.log(event.digit);
                console.log("IVR dtmf event");
                console.log(channel.id);
                
                //sound:custom/recordatendpress_pnd
                //recording:testrecording1
                
                
                
                function stop_playback(dtmfin, callback) {
                    
                    
                    if (dtmfin != '#') {
                        
                        //stop loop playback for intro 
                        obj_ivr_play.intro_ivr_play_current_indx = -1;
                        
                        
                        console.log('stop play back');
                        
                        if (obj_ivr_play.ivrmenu != 1) {
                            playbackIVR.stop(function (err) {
                                
                                
                                
                                
                                
                                if (err) { 
                        //ignore errors
                    
                                }
                                
                                callback();
                            });
                        }


                    } else {
                        callback();
                    }

                }
                
                
                
                
                
                
                
                
                
                
                
                function dtmfhandle(digit_dtmf, skipcheck) {
                    
                    
                    var reckey = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
                    var reckeyafter = ['1', '2', '3', '0'];
                    
                    if (digit_dtmf == 0 && obj_ivr_play.ivrmenu == 4) {
                        //intro 
                        obj_ivr_play.ivrmenu = 0;
                        
                        
                        obj_ivr_play.last_good_dtmf = digit_dtmf;
                        
                        
                        getjobinfo_ivr(job_num, job_name, function (msg_already_rec) {
                            
                            obj_ivr_play.intro_ivr_play_current_indx = 0;
                            console.log('getting ready already rec' + msg_already_rec);
                            
                            
                            obj_ivr_play.ivrmenu = 0;
                            
                            
                            
                            
                            
                            
                            channel.play({ media: 'sound:custom/' + obj_ivr_play.intro_ivr_play[obj_ivr_play.intro_ivr_play_current_indx], skipms: 0 }, playbackIVR).then(function (playback) {



                            }).catch(function (err) {
                                obj_ivr_play.intro_ivr_play_current_indx = -1;
                                
                                
                                console.log('Error Playback ivr');
                            });


    
                        });
    




                    } else if (reckey.indexOf(digit_dtmf) >= 0 && obj_ivr_play.ivrmenu == 0) {
                        
                        obj_ivr_play.last_good_dtmf = digit_dtmf;
                        //recording success yes no
                        obj_ivr_play.rec_yn = 0;
                        
                        obj_ivr_play.ivrmenu = 1;
                        obj_ivr_play.current_msg_rec_edit = digit_dtmf;
                        
                        //recording 
                        
                        
                        
                        if (obj_ivr_play.rec_arr.indexOf(job_num + '_' + job_name.replace(' ', '_') + "_" + digit_dtmf) >= 0 && skipcheck == 0) {
                            
                            
                            obj_ivr_play.ivrmenu = 1;
                            obj_ivr_play.rec_yn = 1;
                            obj_ivr_play.rec_type = 'overwrite';
                            obj_ivr_play.current_msg_rec_edit = digit_dtmf;
                            
                            dtmfhandle('#', 0);


                        } else {
                            
                            
                            
                            
                            channel.play({ media: "sound:custom/recstart_b", skipms: 0 }, playbackIVR).then(function (playback) {
                                console.log('Play Back IVR : recordatendpress_pnd')
                                
                                
                                playback.once('PlaybackFinished', function (event, playback) {
                                    //record audio   
                                    ari_ivr.channels.record({
                                        channelId: channel.id,
                                        format: 'wav',
                                        name: job_num + '_' + job_name.replace(' ', '_') + "_" + digit_dtmf,
                                        ifExists: obj_ivr_play.rec_type,
                                        beep: true,
                                        terminateOn : '#',
                                        maxSilenceSeconds : 10

                                    })
                      .then(function (ivr_msg_recording) {
                                        console.log('succsess record');
                                        obj_ivr_play.rec_yn = 1;
                                        obj_ivr_play.rec_type = 'overwrite';
                                        
                                        
                                        // trim audio after record 1 sec on each end 
                                        ivr_msg_recording.once('RecordingFinished', function (event, recording) {
                         

                                            if (parseInt(event.recording.duration) > 4)
                                            {
                                            trimaudio_func('/var/spool/asterisk/recording/' + job_num + '_' + job_name.replace(' ', '_') + "_" + digit_dtmf, 1, parseInt(event.recording.duration) - 1);
                                            }

                                        });

                        
                                    })
                      .catch(function (err) {
                                        
                                        obj_ivr_play.rec_yn = 0;
                                        obj_ivr_play.rec_type = 'overwrite';
                                        console.log(err);
                                        console.log('recordingerror')
                                    });
            
                                });

                            }).catch(function (err) { console.log('Error Playback ivr recordatendpress_pnd'); });

                        }


                    } else if (digit_dtmf == '#' && obj_ivr_play.ivrmenu == 1 && obj_ivr_play.rec_yn == 1) {
                        obj_ivr_play.last_good_dtmf = digit_dtmf;
                        
                        
                        
                        obj_ivr_play.rec_yn = 0;
                        
                        
                        
                        //console.log('Stop recording # input');
                        
                        obj_ivr_play.ivrmenu = 2;
                        
                        
                        
                        channel.play({ media: "sound:custom/to_listen_1", skipms: 0 }, playbackIVR).then(function (playback) {
                            
                            console.log('to listen play');
                            
                            
                            playback.once('PlaybackFinished', function (event, playback) {
                                
                                channel.play({ media: "sound:custom/b_" + obj_ivr_play.current_msg_rec_edit, skipms: 0 }, playbackIVR).then(function (playback) {
                                    
                                    
                                    playback.once('PlaybackFinished', function (event, playback) {
                                        
                                        channel.play({ media: "sound:custom/after_rec_2" , skipms: 0}, playbackIVR).then(function (playback) { }).catch(function (err) { console.log('Error Playback ivr listen or recrecord'); });

                                    });
                        
                            
                                }).catch(function (err) { console.log('sound play back 1 error'); });
                    
                            });


                
                        }).catch(function (err) { console.log(err); console.log('Listen 1 error'); });
                
                
                    } else if (obj_ivr_play.ivrmenu == 3) {
                        //listen menu 
                        
                        
                        
                        

                        channeloutivr.removeListener('ChannelDtmfReceived', ondtmf_sc);
                        
                        channel.play({ media: 'recording:' + job_num + '_' + job_name.replace(' ', '_') + "_" + digit_dtmf }, playbackIVR).then(function (playback) {
                            
                            
                            
                            
                            
                            playback.once('PlaybackFinished', function (event, playback) {
                                obj_ivr_play.rec_yn = 1;
                                
                                obj_ivr_play.ivrmenu = 1;
                                
                                
                                obj_ivr_play.intro_ivr_play_current_indx = -1;
                                
                                
                                dtmfhandle('#', 0);
                                
                                channeloutivr.on('ChannelDtmfReceived', ondtmf_sc);

                            });
                        }).catch(function (err) { console.log('Error Playback ivr Playback audio'); });

            
            
            
                    } else if (reckeyafter.indexOf(digit_dtmf) >= 0 && obj_ivr_play.ivrmenu == 2) {
                        
                        obj_ivr_play.last_good_dtmf = digit_dtmf;
                        
                        if (digit_dtmf == 1) {
                            obj_ivr_play.ivrmenu = 3;
                            dtmfhandle(obj_ivr_play.current_msg_rec_edit, 0);

                        } else if (digit_dtmf == 2) {
                            
                            
                            
                            obj_ivr_play.ivrmenu = 0;
                            obj_ivr_play.rec_type = 'overwrite';
                            
                            dtmfhandle(obj_ivr_play.current_msg_rec_edit, 1);
                    
                        } else if (digit_dtmf == 3) {
                            
                            obj_ivr_play.ivrmenu = 0;
                            obj_ivr_play.rec_type = 'append';
                            dtmfhandle(obj_ivr_play.current_msg_rec_edit, 1);


                    //append

                        } else if (digit_dtmf == 0) {
                            
                            
                            //back to intro 
                            
                            obj_ivr_play.ivrmenu = 4;
                            dtmfhandle(0, 0);
                        }


                    } else if (obj_ivr_play.ivrmenu != 1) {
                        
                        
                        console.log(obj_ivr_play.last_good_dtmf);
                        channeloutivr.removeListener('ChannelDtmfReceived', ondtmf_sc);
                        
                        stop_playback(666, function () {
                            
                            channel.play({ media: "sound:custom/invaildresp" , skipms: 0}, playbackIVR).then(function (playback) {
                                
                                
                                console.log('hang up ivr');
                                
                                playback.once('PlaybackFinished', function (event, playback) {
                                    
                                    
                                    if (obj_ivr_play.last_good_dtmf == '0') {
                                        
                                        obj_ivr_play.ivrmenu = 4;

                                    } else if (obj_ivr_play.last_good_dtmf == '#') {
                                        
                                        
                                        obj_ivr_play.rec_yn = 1;
                                        obj_ivr_play.ivrmenu = 1;
                                    }
                                    
                                    
                                    
                                    
                                    dtmfhandle(obj_ivr_play.last_good_dtmf, 0);
                                    
                                    channeloutivr.on('ChannelDtmfReceived', ondtmf_sc);
    
                
                                });
            
                            }).catch(function (err) { console.log('INvaild response Playback ivr'); });
                        });


                    }
    
                }
                
                
                
                var vaildkey = ['#', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
                
                
                if (vaildkey.indexOf(event.digit) >= 0) {
                    
                    console.log('vaild key');
                    stop_playback(event.digit, function () {
                        console.log(event.digit);
                        dtmfhandle(event.digit, 0);
                    })
                }
        

     

            
            }
            
            
            channeloutivr.on('ChannelDtmfReceived', ondtmf_sc);
            
            
            
            
            //Main play back finished loop event. 
            
            playbackIVR.on("PlaybackFinished", on_playback_finished);
            
            function on_playback_finished(event) {
                console.log(obj_ivr_play.intro_ivr_play_current_indx)
                
                
                
                
                
                if (obj_ivr_play.intro_ivr_play_current_indx < obj_ivr_play.intro_ivr_play.length - 1 && obj_ivr_play.intro_ivr_play_current_indx != -1) {
                    
                    obj_ivr_play.intro_ivr_play_current_indx += 1;
                    
                    console.log('Playing file : ' + obj_ivr_play.intro_ivr_play[obj_ivr_play.intro_ivr_play_current_indx]);
                    
                    
                    
                    
                    channeloutivr.play({ media: 'sound:custom/' + obj_ivr_play.intro_ivr_play[obj_ivr_play.intro_ivr_play_current_indx] , skipms: 0}, playbackIVR).then(function (playback) {

                    }).catch(function (err) {
                        
                        obj_ivr_play.intro_ivr_play_current_indx = -1;
                        console.log('Error Playback ivr');
                    });
                








                }

            }
            
            channeloutivr.on('StasisStart', function (event, channel) {
                
                console.log('StasisStart')
                socket.emit('ivr_status_msg', '<span class="text-success">In IVR</span>');
                obj_ivr_play.ivrmenu = 0;
                
                
                console.log(obj_ivr_play.intro_ivr_play[obj_ivr_play.intro_ivr_play_current_indx]);
                
                
                
                
                channel.play({ media: 'sound:custom/' + 'intro_msg1' , skipms: 0}, playbackIVR).then(function (playback) {

                }).catch(function (err) {
                    obj_ivr_play.intro_ivr_play_current_indx = -1;
                    
                    
                    console.log('Error Playback ivr');
                });

            

            });
            
            
            
            
            channeloutivr.on('ChannelDestroyed', function (event, channel) {
                
                
                socket.emit('ivr_status_msg', '<span class="text-danger">Hung Up</span>');
                console.log('ChannelDestroyed');
                socket.emit('ChannelDestroyed_ivr', channel.id);


            });
            
            
            
            //    channeloutivr.on('ChannelHangupRequest', function (event, channel) {
            
            //      console.log('ChannelHangupRequest');
            
            //    socket.emit('ChannelDestroyed_ivr', channel.id);
            
            
            // });
            
            
            
            
            //intro 
            
            
            
            
            //dial out procedure
            getjobinfo_ivr(job_num, job_name, function (msg_already_rec) {
                
                console.log('getting ready already rec' + msg_already_rec);
                
                channeloutivr.originate({ endpoint: 'SIP/' + ivrsipgway + '/1' + dialoutnum, app: 'smivrout', appArgs: 'dialed', callerId: '3862710666', "variables": { 'userobj': "Alice" } }).then(function (channel) {
                    
                    fn(channel.id);
                    
                    channel.once('ChannelStateChange', function (event, channel) {
                        console.log(event);

                    });

                    
                    socket.emit('ivr_status_msg', '<span class="text-warning">Dialing Out</span>');
                    
                    
                    console.log('ivr dial out' + channel.id);
                });

    
            });
    


        });
    });

    
   

};






//ARI client connect    'Dispo to DB confirmation to success'
client.connect('http://devacd.datapex.com:8088', 'screstuser', '960f643cb2ab2467bc24366bcb7703eb', clientLoadedv2).then(function (client) {
    console.log('Start up Connect to ARI WebSocket Connection');
    
    //remove all briges from dialer
    client.bridges.list(function (err, bridge) {
        for (var i in bridge) {
            bid = bridge[i].id;
            console.log('destory bridges' + bridge[i].id);
            client.bridges.destroy(
                { bridgeId: bid },
               function (err) { //console.log(err) 
                }
            );
                    
        }
    });
    
    
    //remove all channels from dialer on start 
    client.channels.list(function (err, channels) {
        for (var i in channels) {
            bid = channels[i].id;
            console.log('destory channels' + channels[i].id);
           // client.channels.hangup(
            //    { channelId: bid },
             //  function (err) { //console.log(err) 
              //  }
            //);
                    
        }
    });
    
    
    //io emit connected users every 4 seconds 
    setInterval(function () {
        //   console.log('emit user info');
        
        
        io.emit('serverusersinfo', objuserinfo.conuserinfo_main);


    //    console.log(objuserinfo.conuserinfo_main);
        
      //  console.log(objuserinfo.inbinfo);
    }, 4000);
    
    
    //io emit inbound main queue check 
    setInterval(function () {
        //console.log('inbound Queue hack');
        
        
        if (typeof objuserinfo.inbinfo !== 'undefined') {
            for (var inbkey in objuserinfo.inbinfo) {
                
                
                
                if (objuserinfo.inbinfo[inbkey].currentagchan == '') {
                    console.log('Search agent call Chan inb : ' + inbkey + ' Check Time : ' + moment().format());
                    sendinbagcall(inbkey, client);
                }

            }


        }
        
        
        
        
        if (typeof objuserinfo.conuserinfo_main !== 'undefined') {
            for (var outkey in objuserinfo.conuserinfo_main) {
                
                if (objuserinfo.conuserinfo_main[outkey].chanout == '' && objuserinfo.conuserinfo_main[outkey].agentstatus == 'Available') {
                    
                    console.log(outkey);
                    console.log('Send outbound call');
                    getdialrec_main(outkey);

                } else {
                    console.log(outkey);
                    console.log(objuserinfo.conuserinfo_main[outkey].agentstatus);
                    //console.log(objuserinfo.conuserinfo_main);
                    console.log('Search agent call Chan Out : ' + outkey + ' Check Time : ' + moment().format());
                }
                
            }
                
                
        }

       //console.log(objuserinfo.conuserinfo_main);

        
        //getdialrec_main(socket.id);

       // console.log(objuserinfo);




    }, 4000);
    
    
    //audio file upload to server 
    
    
    
    //on connect v2 of agent function attach listiner to agent socket if Dialer connected to ARI 
    io.on('connection', function (socket) {
        
        
        console.log('Agent Login Socket.io Connection : ' + socket.id);
        
        //Connection to agent button 
        socket.on('connectbtn', function (testvar, endptinput, user_wk) {
            
            io.emit('servermessages', 'Connect Button Presed ' + socket.id + testvar, 'ui');
            var siptype = 'SIP';
            
            objuserinfo.conuserinfo_main[socket.id].chan = ''
            objuserinfo.conuserinfo_main[socket.id].extension = endptinput;
            objuserinfo.conuserinfo_main[socket.id].un = endptinput;
            objuserinfo.conuserinfo_main[socket.id].online_user_wk = user_wk;
            
            var channel = client.Channel();
            
            channel.originate({ endpoint: siptype + '/' + endptinput , app: 'hello-world', callerId : endptinput, variables : { socket : socket.id.replace('/#', '') } }, function (err, channel) {
                //Get Agent Channel Id 
                objuserinfo.conuserinfo_main[socket.id].chan = channel.id;
            }).catch(function (err) { console.log(err) });

        });
        
        //dispo button 
        socket.on('dispobtn', function (socketid, dispoin, dispocodein, fn) {
            
            updatedisplay(socket.id, 'la_ct', function (infoback) {
                socket.emit('agentdisplayinfo', objuserinfo.conuserinfo_main[socket.id]);
            
            });
            
            
            
            
            
            db.updatedisporec(objuserinfo.conuserinfo_main[socket.id].current_att_wk, socket.id, objuserinfo.conuserinfo_main[socket.id].current_contact_type, dispoin, dispocodein).then(function (data) {
                
                
                
                //clear dial data
                clearmainsocketobj(socket.id);
                
                objuserinfo.conuserinfo_main[socket.id].agentstatus = 'Available';
                
                console.log(objuserinfo.conuserinfo_main[socket.id].agentstatus);
                
                
                //get dial infomation for afte dispo
                
                
                //emit message of success
                socket.emit('flashsrvmsg', 'Successful Disposition', 'Dispo Record', 'assets/ico/png/finger-touching-tablet-screen.png', 'green');
                
                
                
                
                fn('Dispo to DB confirmation to success');
                
             
                
            }).catch(function (err) {
                console.log('Update dispo error');
                fn('Dispo to DB confirmation to fail');
            });
       
                   



        });
        
        //Agent chat status button class update  
        socket.on('statusbtn', function (socketid, jsonval) {
            
            if (jsonval.type == 'chat') {
                
                //old arry
                objuserinfo.conuserinfo_main[socket.id].chatstatus = jsonval.btnval;
                
                
                
                io.emit('servermessages', 'Chat Status Updated : ' + socket.id + ' : ' + jsonval.btnval, 'ui');
         
            } 
            else if (jsonval.type == 'dial') {
                
                objuserinfo.conuserinfo_main[socket.id].agentstatus = jsonval.btnval;
                
                
                
                io.emit('servermessages', 'Agent Status Updated : ' + socket.id + ' : ' + jsonval.btnval, 'ui');
                
                
                //get new dial record if availible
                if (jsonval.btnval == 'Available') {
                    
                    
                    
                    //get dial infomation for 
                  // getdialrec_main(socket.id);

                } else {
                    
                    if (typeof objuserinfo.dialinfo[socket.id] !== 'undefined' && typeof objuserinfo.dialinfo[socket.id][0] !== 'undefined') {
                        
                        console.log('sent back');
                        
                        
                        
                        
                        givedialrecback(objuserinfo.dialinfo[socket.id][0].contact_wk, socket.id);




                    }
           


                }




            }
        
        
        });
        
        //Dial button
        socket.on('dialbtn', function (testvar, dialinput, sipgateway) {
            
            
            objuserinfo.conuserinfo_main[socket.id].agentstatus = 'out';
            
            console.log('dial button pressed');
            updatedisplay(socket.id, 'c_ct', function (infoback) {
                socket.emit('agentdisplayinfo', objuserinfo.conuserinfo_main[socket.id]);
            });
            
            var channeloutvar = '';
            var bridge = client.Bridge();
            
            
            //ring on dial button start
            client.channels.ring({ channelId: objuserinfo.conuserinfo_main[socket.id].chan }, function (err) { });
            
            
            
            //create bridge for call on dial 
            bridge.create({ type: 'mixing' }).then(function (bridge) {
                
                //place bridge in socket
                
                objuserinfo.conuserinfo_main[socket.id].bridge = bridge.id;
                
                
                
                
                
                //add agent channel to bridge
                bridge.addChannel({ channel: objuserinfo.conuserinfo_main[socket.id].chan });
                
                
                //new channel for dial out 
                var channelout = client.Channel();
                
                //Orginate outbound call 
                //revisded dial out SIP/5269573987GW1/1, PJSIP/1000
                channelout.originate({ endpoint: 'SIP/' + sipgateway + '/1' + dialinput, app: 'hello-world', appArgs: 'dialed', callerId: '3862710000', "variables": { 'userobj': "Alice" } }).then(function (channel) {
                    
                    
                    
                    
                    console.log('After Outbound :' + channel.id)
                    console.log('After Outbound :' + sipgateway)
                    
                    objuserinfo.conuserinfo_main[socket.id].lastdialtime = d.toLocaleString();
                    objuserinfo.conuserinfo_main[socket.id].current_att_phone = dialinput;
                    objuserinfo.conuserinfo_main[socket.id].current_att_wk = 0;
                    
                    
                    //write attempt outbound to database 
                    console.log('dialout to db');
                    db.insertattrec(objuserinfo.conuserinfo_main[socket.id], objuserinfo.dialinfo[socket.id][0], 'SCO').then(function (data) {
                        
                        //after insert tag record in obj with current attempt_wk 
                        objuserinfo.conuserinfo_main[socket.id].current_att_wk = data.att_wk;






                    }).catch(function (err) { console.log(err) });
                    
                    
                    channel.on('ChannelDestroyed', function (event, channel) {
                        
                        console.log('ChannelDestroyed' + channel.name);
                        socket.emit('flashsrvmsg', 'Hang Up', 'Call Ended' + channel.name, 'assets/ico/png/telephone-receiver-with-circular-arrows.png', 'blue');
                        //delete if smart contact done. 
                        
                        
                        if (typeof objuserinfo.scmsgleave[channel.id] != "undefined") {
                            db.updatedisporec(objuserinfo.scmsgleave[channel.id].att_wk, socket.id, 'SCO', -Math.abs(objuserinfo.scmsgleave[channel.id].dispowk), objuserinfo.scmsgleave[channel.id].dispo).then(function (data) {
                                //after update attempt remove record in obj for leave message     
                                console.log('delete ' + channel.id + 'from message array');
                                delete objuserinfo.scmsgleave[channel.id];

                            }).catch(function (err) { console.log('udpate db erro' + err) });
                        } else {
                            db.updatedisporec(objuserinfo.conuserinfo_main[socket.id].current_att_wk, socket.id, 'SCO', 0, 0).then(function (data) {
                                //after update attempt remove record in obj for leave message     
                                console.log('udpate end date of call');
                            }).catch(function (err) { console.log('udpate db erro' + err) });
                        }
                    });
                    
                    channel.on('ChannelHangupRequest', function (event, channels) {
                        
                        console.log('ChannelHangupRequest inner 1' + channels.id);
                        console.log('ChannelHangupRequest inner 2' + objuserinfo.conuserinfo_main[socket.id].chanout);
                        //console.log(event.channel);
                        
                        
                        
                        if (typeof objuserinfo.scmsgleave[channels.id] === "undefined") {
                            
                            client.bridges.list(function (err, bridge) {
                                
                                
                                for (var i in bridge) {
                                    
                                    
                                    bid = bridge[i].id;
                                    
                                    console.log('destory bridges' + bridge[i].id);
                                    
                                    
                                    if (bridge[i].channels.length == 1 && objuserinfo.conuserinfo_main[socket.id].chan == bridge[i].channels[0]) {
                                        client.bridges.destroy({ bridgeId: bid }, function (err) { console.log('error bridge chabnge'); console.log(err); });
                                        console.log('destory bridges hang up request' + bid);
                                    }



                                }


                            });
    

                        }
                        
                        
                        if (channel.id == objuserinfo.conuserinfo_main[socket.id].chanout && typeof objuserinfo.scmsgleave[channel.id] === "undefined") {
                            
                            
                            console.log('send hang up real');
                            
                            socket.emit('hanguponuser', socket.id);
                            
                            
                            objuserinfo.conuserinfo_main[socket.id].agentstatus = 'dispo';
                            
                            
                            client.channels.ringStop(
                                { channelId: objuserinfo.conuserinfo_main[socket.id].chan })
                                .then(function () { })
                            .catch(function (err) { console.log('ring stop err'); });
                        

                        





                        } else { console.log('NOTsend hang up'); }


                    });
                    
                    
                    
                    
                    //Get Agent Channel Id 
                    objuserinfo.conuserinfo_main[socket.id].chanout = channel.id;
                    console.log('After Outbound * :' + objuserinfo.conuserinfo_main[socket.id].chanout)
                    
                    channel.on('StasisStart', function (event, channel) {
                        
                        
                        console.log('*StasisStart of outbound :' + objuserinfo.conuserinfo_main[socket.id].bridge);
                        console.log('*StasisStart of outbound channel var:' + channel.id);
                        
                        
                        
                        
                        client.bridges.get({ bridgeId: objuserinfo.conuserinfo_main[socket.id].bridge })
                                      .then(function (bridge) {
                            
                            bridge.addChannel({ channel: objuserinfo.conuserinfo_main[socket.id].chanout }).then(function () { })
                                            .catch(function (err) { console.log('Bridge add channel err'); });
                            
                            
                            console.log(bridge.id);
                            
                            
                            client.channels.ringStop(
                                { channelId: objuserinfo.conuserinfo_main[socket.id].chan })
                                .then(function () { })
                                            .catch(function (err) { console.log('ring stop err'); });

                        
                        }).catch(function (err) { });

                    
                    });


                }).catch(function (err) { });


            });


        });
        
        //Play button audio file   
        socket.on('playbtn', function (testvar) {
            
            console.log('playing on' + objuserinfo.conuserinfo_main[socket.id].bridge);
            io.emit('servermessages', 'Play Button Presed ' + socket.id + testvar, 'ui');
            
            
            //add to call count 
            updatedisplay(socket.id, 'smc_ct', function (infoback) {
                
                console.log('then display info call func info' + infoback);
                socket.emit('agentdisplayinfo', objuserinfo.conuserinfo_main[socket.id]);
            
            });
            var playback = client.Playback();
            
            //on play get ids incase dial fast dial 
            var current_bridgevar = objuserinfo.conuserinfo_main[socket.id].bridge;
            var current_chanoutvar = objuserinfo.conuserinfo_main[socket.id].chanout;
            var current_agchan = objuserinfo.conuserinfo_main[socket.id].chan;
            
            //push into leave alone on hang up message array 
            objuserinfo.scmsgleave[current_chanoutvar] = { sktid : socket.id, bri : current_bridgevar, chan : current_chanoutvar, dispo : 'SCM', contact_wk : objuserinfo.dialinfo[socket.id][0].contact_wk, dispowk : 5, att_wk : objuserinfo.conuserinfo_main[socket.id].current_att_wk };
            
            
            //mute channel on play back of smart contact message
            client.channels.mute({ channelId: current_agchan, direction : 'in' }, function (err) { console.log('mute chan error'); console.log(err); });
            
            
            
            client.bridges.play({ bridgeId: current_bridgevar, media: objuserinfo.dialinfo[socket.id][0].sc_msg_path }).then(function (playback) {
                playback.on('PlaybackFinished', function (event, playback) {
                    client.bridges.get({ bridgeId: playback.target_uri.replace('bridge:', '') }, function (err, bridge) {
                        if (typeof bridge !== 'undefined') {
                            console.log('bridge to hangupon HCNA' + bridge.channels[0]);
                            client.bridges.destroy({ bridgeId: playback.target_uri.replace('bridge:', '') }).then(function () {
                                client.channels.hangup(
                                    { channelId: current_chanoutvar },
                                                                  function (err) { console.log('hangup' + err); });
                            }).catch(function (err) { console.log(err) });
                        }
                    });
                });
            }).catch(function (err) { });
            
            
            //drop agent off bridge after 2 seconds ?? may not work in multi env
            setTimeout(function () {
                //get new record after drop off bridge 
                getdialrec_main(socket.id);
                console.log('remove from bridge ' + objuserinfo.conuserinfo_main[socket.id].bridge);
                console.log('remove chanc from chan ' + objuserinfo.conuserinfo_main[socket.id].chan);
                client.bridges.get({ bridgeId: objuserinfo.conuserinfo_main[socket.id].bridge }, function (err, bridge) {
                    
                    
                    if (typeof bridge !== 'undefined') {
                        if (typeof bridge.channels[0] !== 'undefined' && typeof bridge.channels[1] !== 'undefined') {
                            client.bridges.removeChannel({ bridgeId: objuserinfo.conuserinfo_main[socket.id].bridge, channel : objuserinfo.conuserinfo_main[socket.id].chan }).then(function () {
                            
                        
                            }).catch(function (err) { console.log(err) });

                        }

                    }
                });
            
            
            }, 2000);
        });
        
        //on hang up button 
        socket.on('hangupbtn', function (socketid) {
            //get channel from socket 
            
            //hang up on channel 
            
            console.log('Hang up On Channel : ' + objuserinfo.conuserinfo_main[socket.id].chanout + ' from bridge : ' + objuserinfo.conuserinfo_main[socket.id].bridge);
            
            
            client.channels.ringStop({ channelId: objuserinfo.conuserinfo_main[socket.id].chan }).then(function () { }).catch(function (err) {
                
                console.log('Ring stop err hang up btn Channel : ' + objuserinfo.conuserinfo_main[socket.id].chan);
            });
            
            client.channels.hangup({ channelId: objuserinfo.conuserinfo_main[socket.id].chanout }).then(function () { }).catch(function (err) {
                console.log('Hang up btn channel : ' + objuserinfo.conuserinfo_main[socket.id].chanout);
            });
              
        });
        
        //on disconnect button
        socket.on('discconnbtn', function (testvar) {
            //hang up on channel 
            client.channels.hangup({ channelId: objuserinfo.conuserinfo_main[socket.id].chan }).then(function () { }).catch(function (err) {
                console.log('Disconnect btn channel : ' + objuserinfo.conuserinfo_main[socket.id].chanout);
            });

        });
        
        //on disconnect of agent 
        socket.on('disconnect', function () {
            if (typeof objuserinfo.conuserinfo_main[socket.id] !== 'undefined') {
                
                //get channel from socket before remove from array 
                console.log('hang up on channel agent due to dissconnect');
                
                //hang up on agent channel 
                client.Channel(objuserinfo.conuserinfo_main[socket.id].chan).hangup().then(function () { }).catch(function (err) { });
                
                //destrory any bridges after disconnect
                client.bridges.destroy({ bridgeId: objuserinfo.conuserinfo_main[socket.id].bridge }).then(function () { }).catch(function (err) { });
                
                
                console.log('remove from obj');
                delete objuserinfo.conuserinfo_main[socket.id];
            
            } else {
                console.log('remove from obj');
                console.log('Non agent socket disconnect');
            }


        });




    });


}).then(function (err, client) { });


//on connect v2 of agent for non agent functionality ie.chat etc
io.on('connection', function (socket) {
    
    console.log('log in request non agent handlers :' + socket.id);
    
    
    
    
    
    
    //campaign ivr display 
    socket.on('disp_camp', function (bis_unit, fn) {
        
        db.campaign_display(bis_unit)
    .then(function (data) {
            
            //   console.log(data);
            
            fn(data);
       

            

        }).catch(function (err) {
            
            
            
            console.log(err);
        });

        
    });
    
    
    
    
    
    
    socket.on('save_file', function (file_name_wav, blob_wav, filenamesave, fn) {
        console.log(file_name_wav.replace('blob:', ''));
        //  console.log(blob_wav);
        //  console.log(blob_wav.blob);
        var buf = new Buffer(blob_wav.blob, 'base64'); // decode
        console.log(filenamesave)
        fs.writeFile("sc/useraudio/" + filenamesave + ".wav", buf, function (err) {
            if (err) {
                console.log("err", err);
            } else {
                console.log('saved success');
                fn(true);

            }
        })





    });
    
    
    d = new Date();
    var socketstr = socket.id.replace('/#', '');
    
    
    
    
    
    
    //console.log(socket.request);
    console.log(socket.request._query['fromsc']);
    
    
    if (socket.request._query['fromsc'] == 'undefined') {
        
        console.log('add array check')
    } else {
        console.log('del array check')
    
    }
    
    
    
    //if socket id not already in array 
    if (typeof objuserinfo.conuserinfo_main[socket.id] == 'undefined' && typeof socket.request._query['fromsc'] == 'undefined') {
        //push into array on connection **
        
        
        
        objuserinfo.conuserinfo_main[socket.id] = { useridsock: socketstr , extension: socket.request._query['end_point_ext'], name : socket.request._query['first_name'] + ' ' + socket.request._query['last_name'], un : socket.request._query['end_point_ext'], pass : socket.request._query['pwd'] , userlevel : '', connecttime: d.toLocaleString(), lastchattime : '', lastdialtime : '', chan : '', bridge: '', agentstatus : 'Disconnected', chatstatus : 'Away', chanout : '', online_user_wk : socket.request._query['online_user_wk'], current_att_phone : '', current_att_dnis : '', current_att_wk : '', current_contact_type : '', skills_wks : socket.request._query['skills'], c_ct : 0, smc_ct : 0 , la_ct : 0, vm_ct : 0 };
   
    
    } else {
        
        
        console.log(socket.id + ' : already in array or non agent login if = 4 : |' + socket.request._query['user_type_wk']);
         
    }
    
    
    //emit update info call counts
    // socket.emit('agentdisplayinfo', objuserinfo.conuserinfo_main[socket.id]);
    
    //chat send button
    socket.on('chatbtnsend', function (chatinput, inname) {
        console.log("User click chat button to send :  " + chatinput);
        
        console.log(inname);
        io.emit('chatclient', chatinput, socket.id.replace('/#', ''), inname);
    });
    
  
});

// handler for stasisStart event
function stasisStart(event, channel) {

   // console.log(util.format('status start ', channel.name));
    

  //  console.log(util.format('Channel %s just  entered application', channel.name));
    
    
  //  console.log(util.format( 'Channel %s just  entered application ID', channel.id));
    
    //var socketidvar = '';
    //var currentbridge = '';
    
}

// handler for StasisEnd event
function stasisEnd(event, channel) {
  //  console.log(util.format( 'Channel %s just left our application', channel.name));
}

// handler for playbackFinished event
function playbackFinished(event, completedPlayback) {
    console.log(util.format('Monkeys successfully vanquished %s; hanging them up', completedPlayback));
}

// handler for playbackStarted event
function playbackStarted(event, playback) {
    
    console.log(util.format('Monkeys successfully started %s; started them up', playback));



}

//handler for channelEnteredBridge event
function channelEnteredBridge(event, obj) {
  //  console.log(util.format('Channel %s just entered Bridge testing : ' + obj.bridge.id , obj.channel.name));

  

}

//handler for channelLeftBridge event
function channelLeftBridge(event, obj) {
   // console.log(util.format( 'Channel %s just left Bridge testing : ' + obj.bridge.id , obj.channel.name));




}

//handler for bridgeDestroyed event
function bridgeDestroyed(event, obj) {
    console.log(util.format('bridgeDestroyed %s just left Bridge'));
}


//Http port socket id listen port 
http.listen(listenporthttp, function () {
    
    console.log('Smart Contact Node Dial App Listening on : ' + listenporthttp);
  
});
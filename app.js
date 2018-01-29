var compression = require('compression');
var ical = require('ical-generator');
var express = require('express');
var app = express();
//compression
app.use(compression());
var request = require("request");
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var flash = require('connect-flash');
//astrisk client 
var client = require('ari-client');
//astrisk ari IVR client 
var client_ari_ivr = require('ari-client');
var path = require('path');








//astrisk sox test 

var SoxCommand = require('sox-audio');
var command = SoxCommand();

//wav info 
var wavFileInfo = require('wav-file-info');

var get_wav_duration = function (wavefile) {
    return wavFileInfo.infoByFilename(wavefile, function (err, info) {
        if (err) throw err;
        return info.duration;
    });
}

//timezone to zip 
var zipcode_to_timezone = require('zipcode-to-timezone');

//wether 
var weather = require('node-openweather')({
    key: "f5a740b8eebb89190e4571b92cc51618",
    accuracy: "like",
    units: "Imperial",
    language: "en"
});

var getweather_zip = function (zip_in, cb) {
    weather.zip(zip_in).now().then(function (res) {
        //success logic
        return cb(res);
    }).catch(function (err) {
        //error handling
        console.log('error weather');
        return cb(err);
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
//var options = { key: fs.readFileSync('sc/keys/smartcontactdev.key'), cert: fs.readFileSync('sc/keys/devacd_datapex_com.crt') };
var options = { key: fs.readFileSync('sc/keys/smartcontactdev.key'), cert: fs.readFileSync('sc/keys/devacd_datapex_com.crt') };


//DB function database 
var db = require('./db');

//mail functions
var mail_sync = require('./mail_sync.js');

//moment time calc
var moment = require('moment');
moment().format();

request = require('request')
parser = require('node-feedparser')

var listenporthttps = 543
var listenporthttp = 1337


var http = require('http').Server(app).listen(listenporthttp);
var https = require('https').Server(options, app).listen(listenporthttps);
var url = require('url');

var io = require('socket.io')(http);
var SocketIOFileUpload = require('socketio-file-upload')


//user info main object 
var objuserinfo = {};
objuserinfo.conuserinfo = [];
objuserinfo.conuserinfo_main = {};
objuserinfo.dialinfo = [];
objuserinfo.logininfo = [];
objuserinfo.scmsgleave = {};
objuserinfo.inbinfo = [];
objuserinfo.logintrack_obj = [];


app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(flash());
app.use(SocketIOFileUpload.router);

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



app.get('/', function (req, res) {
    
    //if cooke destroy 
    if (req.isAuthenticated() == true) { req.session.destroy(function (err) { }); }
    return res.status(404).render('403');
});

// sign on 
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



/*
var fonts = {
    Roboto: {
        normal: path.join(__dirname, '..', 'examples', '/assets/fonts/Roboto-Regular.ttf'),
        bold: path.join(__dirname, '..', 'examples', '/assets/fonts/Roboto-Medium.ttf'),
        italics: path.join(__dirname, '..', 'examples', '/assets/fonts/Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, '..', 'examples', '/assets/fonts/Roboto-MediumItalic.ttf')
    }
};

var PdfPrinter = require('pdfmake');
var printer = new PdfPrinter(fonts);
var fs = require('fs');

var docDefinition = {
    content: [
        'First paragraph',
        'Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines'
    ]
};

var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('pdfs/basics.pdf'));
pdfDoc.end();
*/



function ensureAuthenticated(req, res, next) {
    


    if (req.isAuthenticated()) {
        // req.user is available for use here
        return next();
    }
    // denied. redirect to login
    res.redirect('/')
}







//user agent
app.get('/useragent', ensureAuthenticated, function (req, res) {
    //res.send("access granted. secure stuff happens here");
    if (req.isAuthenticated()) {
        return res.render('scagent', { user : req.user });
        }
    
    return res.status(404).render('404');
    

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
        console.log(data.online_user_wk );
        console.log(objuserinfo.logintrack_obj)
      console.log(objuserinfo.logintrack_obj.filter(function (value) { return value.user_wk == data.online_user_wk }));
        

        if (data) {
            
            if ((objuserinfo.logintrack_obj.filter(function (value) { return value.user_wk == data.online_user_wk })).length >= 1) {

                return done(null, false, { message: 'User Already Logged In' });

            }
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
        console.log(user);
        
        

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

//sox listeners 
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
var concat_audio_func_arr = function (fileNameList, outputFileName, cb) {
    var command = SoxCommand();
    fileNameList.forEach(function addInput(fileName) {
        command.input(fileName.file);
    });
    command.output(outputFileName)
		.concat();
    command.on('end', function () {
        fs.chown(outputFileName, 499, 498, function (err) {
            if (err) { cb(0); }
        });
        cb(1);
        console.log('Sox command succeeded!');
    });
    command.run();
}
//sox testing 
var trimaudio_func = function (audioin, starttrim, filelen) {
    console.log(filelen + ' : in func file len');
    var command3 = SoxCommand()
    .input(audioin + ".wav")
.output(audioin + "_trim.wav")
.addEffect('fade', [0.3, 0, 0.3]);
    
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

function findinarrbysocket(socketsearch) {
    var indexret = -1;
    if (objuserinfo.scmsgleave) {
        for (var outkey in objuserinfo.scmsgleave) {
            if (objuserinfo.scmsgleave[outkey]['sktid'] == socketsearch) {
                indexret = 1;
            }
        }
    }
    return indexret;
   
};


// handler for client being loaded
function clientLoadedv2(err, client) {
    console.log('client loaded');
    client.on('StasisStart', stasisStart);
    client.on('StasisEnd', stasisEnd);
    client.on('ChannelEnteredBridge', channelEnteredBridge);
    client.on('ChannelLeftBridge', channelLeftBridge);
    client.start('hello-world');
};

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        getdialrec
        return false;
    }
    return true;
}


//not used in queue
function givedialrecback(contact_wk, socketid) {
    objuserinfo.dialinfo[socketid] = [];
    db.givedialrecdb(contact_wk).then(function (data) {
        console.log('gave back dial rec' + data);
        io.to(socketid).emit('flashsrvmsg', 'Record Return', 'Record ' + contact_wk + ' back to skill', 'assets/ico/png/smartphone-with-reload-arrows.png' , 'red');
    }).catch(function (err) {
        console.log('err on give back dial reco' + err);
    });
}

function clearmainsocketobj(socketidin) {
    if (objuserinfo.conuserinfo_main[socketidin])
        {
        objuserinfo.conuserinfo_main[socketidin].bridge = '';
        objuserinfo.conuserinfo_main[socketidin].current_att_phone = '';
        objuserinfo.conuserinfo_main[socketidin].current_att_dnis = '';
        objuserinfo.conuserinfo_main[socketidin].skill_name = '';
        objuserinfo.conuserinfo_main[socketidin].current_att_wk = 0;
        objuserinfo.conuserinfo_main[socketidin].chanout = '';
        objuserinfo.conuserinfo_main[socketidin].lastdialtime = '';
        objuserinfo.conuserinfo_main[socketidin].current_contact_type = '';
    }
}


//not used single queue
function getdialrec_main(socketidin) {
  
    objuserinfo.conuserinfo_main[socketidin].agentstatus = 'preview';
    console.log('Getting dial record' + socketidin);
    io.to(socketidin).emit('flashsrvmsg', 'Get Record', 'Pull dial record', 'assets/ico/png/phone-book.png', 'green');
    //test
    //objuserinfo.conuserinfo_main[socket.id.skills_wks
    //get call information 
    db.getdialrec(objuserinfo.conuserinfo_main[socketidin].skills_wks.replace(/[|,]/g, ","), socketidin)
        .then(function (data) {
        
        

        objuserinfo.dialinfo[socketidin] = [];
        console.log('pull new dial record query data');
        objuserinfo.conuserinfo_main[socketidin].current_contact_type = 'SCO';
        
 
        //push call info to screen  
        io.to(socketidin).emit('callinfo', data, objuserinfo.conuserinfo_main[socketidin]);
        objuserinfo.dialinfo[socketidin].push(data);
    }).catch(function (err) {
        objuserinfo.conuserinfo_main[socketidin].agentstatus = 'Available';
        console.log('NO records Avail');
        io.to(socketidin).emit('callinfo', 0);
    });
    
    
       
   

}

//returns contact wk main get dial rec procd
function getdialrec_main_cb(socketidin, cb) {
    objuserinfo.conuserinfo_main[socketidin].agentstatus = 'preview';
 
    console.log('Getting dial record' + socketidin);
    io.to(socketidin).emit('flashsrvmsg', 'Get Record', 'Pull dial record', 'assets/ico/png/phone-book.png', 'green');
    //get call information 
    db.getdialrec(objuserinfo.conuserinfo_main[socketidin].skills_wks.replace(/[|,]/g, ","), socketidin)
        .then(function (data) {
        io.sockets.connected[socketidin].socket_dialinfo.skill_wk = data.skill_wk;
        insert_track_fn(io.sockets.connected[socketidin], 4, function (tracking) { }); 
        objuserinfo.dialinfo[socketidin] = [];
        console.log('pull new dial record query data');
        objuserinfo.conuserinfo_main[socketidin].current_contact_type = 'SCO';
        //push call info to screen  
        io.to(socketidin).emit('callinfo', data, objuserinfo.conuserinfo_main[socketidin]);
        // ysql_search_pull(1, data.contact_zip, socketidin);
        //newsdatapull(socketidin, data.contact_zip);
        objuserinfo.dialinfo[socketidin].push(data);
        // console.log(objuserinfo.dialinfo[socketidin][0].sc_msg_path);
        cb(data.contact_wk);
    }).catch(function (err) {
        objuserinfo.conuserinfo_main[socketidin].agentstatus = 'Available';
        console.log(err);
        cb(-1);
        console.log('NO records Avail');
        //console.log(objuserinfo.conuserinfo_main[socketidin].agentstatus);
        io.to(socketidin).emit('callinfo', 0);
    });
}

function updatedisplay(updateinfo, typeupdate, callback) {
    
    if (objuserinfo.conuserinfo_main[updateinfo]) {
        if (typeupdate == 'c_ct') {
            objuserinfo.conuserinfo_main[updateinfo].c_ct += 1;
        } else if (typeupdate == 'smc_ct') {
            objuserinfo.conuserinfo_main[updateinfo].smc_ct += 1;
        } else if (typeupdate == 'la_ct') {
            objuserinfo.conuserinfo_main[updateinfo].la_ct += 1;
        }
    }
    callback('giving this back after update' + typeupdate + updateinfo);
}


//function db attempt update 
function att_db_update(callback) {
    db.updaterec_att().then(function (data) {
        callback();
    }).catch(function (err) {
        callback();
        console.log('Attempt update error' + err);
    });
}

//attempt update every 10 sec 
function wait10sec() {
    setTimeout(function () {
        att_db_update(wait10sec);
    }, 4000);
}

//start attempt update every 1000 sec 
//UNCOMMENTPROD
//att_db_update(wait10sec);

Date.prototype.addHours = function (h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
}



//send email routines
function email_queue_send_fn(callback) {
    var emailsend_ct = 0;
    //console.log('email send');
    db.email_queue_send().then(function (data) {
        if (data.length == 0) {
            console.log('no emails to send');
            emailsend_ct = 0;
            callback();
        }
        
        var datalen = data.length;

        for (var i = 0, len = data.length; i < len; i++) {
            console.log('sending' + data[i].email_queue_wk);
            // appt_dt_st, appt_dt_end 
            var email_to_Send_obj = {};
            if (data[i].email_type == 1) {
                email_to_Send_obj =
            {
                    from: '"' + data[i].email_from_name + '" <' + data[i].email_from + '>', // sender address
                    to: data[i].email_send, // list of receivers
                    subject: data[i].email_subject  , // Subject line        
                    text: data[i].email_html , // plaintext body
                    html: data[i].email_html , // html body
                };
            } else if (data[i].email_type == 2 || data[i].email_type == 3) {
                
                cal = ical({
                    domain: 'realsmartconatact.com',
                    prodId: '//srealsmartcontact.com//ical-generator//EN',
                    events: [
                        {
                            start: new Date(data[i].appt_dt_st),
                            end: new Date(data[i].appt_dt_end),
                            timestamp: new Date(),
                            summary: 'Appointment ' + data[i].appt_dt_send,
                            location: 'Phone Appointment : ' + '[' + data[i].att_phone_send + ']',
                            summary: 'Appointment with ' + data[i].email_to_name ,
                            organizer : data[i].email_from_name + '<' + data[i].email_from + '>',
                            attendees : [{ email: data[i].email_send, name: data[i].email_to_name },
                                { email: data[i].email_from, name: data[i].email_from_name }]
                        }
                    ]
                }).toString();
                
                
                email_to_Send_obj =
                    {
                    from: '"' + data[i].email_from_name + '" <' + data[i].email_from + '>', // sender address
                    to: data[i].email_send, // list of receivers
                    subject: data[i].email_subject  , // Subject line        
                    text: data[i].email_html , // plaintext body
                    html: data[i].email_html , // html body
                    attachments: [
                        {
                            
                            filename: 'event.ics',
                            content: cal,
                            contentType: "text/calendar"
            
                        }, ,
                        {
                            filename: 'user.vcf',
                            content: data[i].user_vcard,
                            contentType: "text/x-vcard"
                        },
                        {
                            filename: 'contact.vcf',
                            content: data[i].contact_vcard,
                            contentType: "text/x-vcard"
                        }]
                };
            } else if (data[i].email_type == 4 ) { 
            
                cal = ical({
                    domain: 'realsmartconatact.com',
                    prodId: '//srealsmartcontact.com//ical-generator//EN',
                    events: [
                        {
                            start: new Date(data[i].appt_dt_st),
                            end: new Date(data[i].appt_dt_end),
                            timestamp: new Date(),
                            location: 'Callback reminder : ' + data[i].email_to_name + '[' + data[i].att_phone_send + ']',
                            summary: 'Callback reminder for  ' + data[i].email_to_name + ' at ' + data[i].appt_dt_send + '[' + data[i].att_phone_send + ']',
                            organizer : data[i].email_from_name + '<' + data[i].email_from + '>',
                            attendees : [{ email: data[i].email_send, name: data[i].email_to_name },
                                { email: data[i].email_from, name: data[i].email_from_name }]
                        }
                    ]
                }).toString();
                
                
                
                email_to_Send_obj =
                    {
                    from: '"' + data[i].email_from_name + '" <' + data[i].email_from + '>', // sender address
                    to: data[i].email_send, // list of receivers
                    subject: data[i].email_subject  , // Subject line        
                    text: data[i].email_html , // plaintext body
                    html: data[i].email_html , // html body
                    attachments: [
                        {
                            filename: 'event.ics',
                            content: cal,
                            contentType: "text/calendar"
            
                        },
                        {
                filename: 'contact.vcf',
                content:  data[i].contact_vcard,
                contentType: "text/x-vcard"
                        }



                    ]
                };
            }
            mail_sync.sendmailcheck(email_to_Send_obj, data[i].email_queue_wk, function (email_status, email_queue_wk) {
                if (email_status != 0) {
                   db.email_queue_update(email_queue_wk, 1).then(function (data) {
                        emailsend_ct += 1;
                        if (emailsend_ct == datalen) { callback(); }
                    }).catch(function (err) {
                        emailsend_ct += 1;
                        if (emailsend_ct == datalen) {callback(); }
                    });
                } else {
                    db.email_queue_update(email_queue_wk, -1).then(function (data) {
                         emailsend_ct += 1;
                        if (emailsend_ct == datalen) { callback(); }
                    }).catch(function (err) {
                        emailsend_ct += 1;
                        if (emailsend_ct == datalen) { callback(); }
                    });
                }
            });
        }
       
    }).catch(function (err) {
        
        console.log(err);
        console.log('email send fail');
        callback();
    });
};

//check email send every 10 sec
function wait10secEMAIL() {
    setTimeout(function () {
        email_queue_send_fn(wait10secEMAIL);
    }, 10000);
}

//start email send 
//UNCOMMENTPROD
//email_queue_send_fn(wait10secEMAIL);


//user tracking insert 
function insert_track_fn(socketin, tracktype,  fn) {
    
    var inobjsend = { user_wk: socketin.request._query['online_user_wk'], track_wk : tracktype, skill_wk : socketin.socket_dialinfo.skill_wk, track_dt : moment().format('MM/DD/YYYY HH:MM:ss') };
    


    db.insert_user_tracking(inobjsend).then(function (data) {
        fn(data);
    }).catch(function (err) {
        
        console.log(err);
        fn(-1);
    });
}



//IVR outbound menu  test menu 
//UNCOMMENTPROD
client_ari_ivr.connect('http://devacd.datapex.com:8088', 'screstuser', '960f643cb2ab2467bc24366bcb7703eb', IVRclientLoadedv2test).then(function (client_ari_ivr) {}).catch(function (err) { console.log(err) });




// handler for IVR ARI client being loaded
function IVRclientLoadedv2test(err, ari_ivr) {
    ari_ivr.start('smivroutz');
    function load_db_audio() {
        var audio_job_arr_obj = [];
        ari_ivr.recordings.listStored().then(function (storedrecordings) {
            storedrecordings.forEach(function (rec_file, idx) {
                if (Number.isInteger(parseInt(rec_file.name.split("_")[0]))) {
                    var audio_job_obj = {};
                    audio_job_obj.audio_name = rec_file.name;
                    audio_job_obj.msg_num = rec_file.name.split("_")[rec_file.name.split("_").length - 1];
                    audio_job_obj.skill_wk = rec_file.name.split("_")[0];
                    audio_job_arr_obj.push(audio_job_obj);
                }
            });
            db.updatedb_audio(audio_job_arr_obj).then(function (data) { }).catch(function (err) {
            });
        });
    }
    setInterval(function () {
        load_db_audio();
    }, 10000);
    
    io.on('connection', function (socket) {
        //hang up on ivr routine 
        socket.on('call_ivr_hangup', function (channelin) {
            ari_ivr.channels.hangup({
                channelId: channelin
            }) .then(function () {
                console.log('Hang up on IVR');
            }).catch(function (err) { });
        });
        //check load audio changed
        socket.on('load_audio', function (job_num, max_att, fn) {
            var countrec = 0;
            var countrec_all = 0;
            var audio_job_arr_obj = [];
      
            
            ari_ivr.recordings.listStored().then(function (storedrecordings) {
                if (storedrecordings.length == 0) {
                    fn(audio_job_arr_obj);
                }
                storedrecordings.forEach(function (rec_file, idx) {
                   // console.log('Recording for each : ' + rec_file.name);
                    if (rec_file.name.startsWith(job_num + '_') == true) {
                        var audio_job_obj = {};
                        audio_job_obj.audioname = rec_file.name;
                        //console.log(countrec + '|' + max_att);
                        audio_job_obj.msg_num = rec_file.name.split("_")[rec_file.name.split("_").length - 1];
                        audio_job_arr_obj.push(audio_job_obj);
                        
                    }
                });
                
                audio_job_arr_obj.forEach(function (rec_file, idx) {
                    fs.readFile("/var/spool/asterisk/recording/" + rec_file.audioname + ".wav", function (err, data) {
                        audio_job_arr_obj[idx].encodeb64out = data.toString('base64');
                        countrec += 1;
                        if (err) {
                            fn(audio_job_arr_obj);
                        }
                        if (countrec == audio_job_arr_obj.length) {
                            console.log('cb');
                            fn(audio_job_arr_obj);
                        }
                    });
                });
                
                

                if (audio_job_arr_obj.length == 0) {
                    fn(audio_job_arr_obj);
                }



            }).catch(function (err) { fn(audio_job_arr_obj); });
        });

        //v2 real ivr msg append
        socket.on('call_ivr', function (jobnum_in, campname_in, phonenum_in, max_att_in, fn) {
            
            console.log('call testing 2 ivr');
            //new channel for dial out 
            var channeloutivr = ari_ivr.Channel();
            var dialoutnum = phonenum_in;
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
            obj_ivr_play.msg_rec_max = max_att_in;
            obj_ivr_play.rec_arr = [];
            obj_ivr_play.intro_ivr_play = ["intro_msg1", "b_" , "intro_msg2", "intro_msg3", "record_key_1", "record_msg_prompt_1", "record_msg_prompt_2", "record_msg_prompt_3", "record_msg_prompt_4", "record_msg_prompt_5", "record_msg_prompt_6", "record_msg_prompt_7", "record_msg_prompt_8", "record_msg_prompt_9"];
            var fileNameListintro = 
                [{
                    'file': '/var/lib/asterisk/sounds/en/custom/intro_msg1.wav', 
                    'varname': 'a'
                }, 
               
                {
                    'file': '/var/lib/asterisk/sounds/en/custom/b_', 
                    'varname': 'b'
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
                }];
            
            
            var fileNameListintro_tolisten =
                [{
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
                        if (rec_file.name.indexOf(job_num + '_' + job_name.replace(/ /g, '_')) >= 0) {
                            recarray.push(rec_file.name);
                        } });
                    
                    obj_ivr_play.rec_arr = recarray;
                    obj_ivr_play.msg_rec_num = recarray.length;

                    if (recarray.length == 0) {
                        fileNameListintro[1].file = fileNameListintro[1].file + obj_ivr_play.msg_rec_max + '.wav'
                        fileNameListintro[1].varname = fileNameListintro[1].varname + '_' + obj_ivr_play.msg_rec_max
                        fileNameListintro.splice(4, 1);
                    } else {
                        fileNameListintro[1].file = fileNameListintro[1].file + obj_ivr_play.msg_rec_max + '.wav'
                        fileNameListintro[1].varname = fileNameListintro[1].varname + '_' + obj_ivr_play.msg_rec_max
                        fileNameListintro.splice(3, 1);
                    }
                    
                   
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
                    }
                       );
                    for (i = 1; i <= obj_ivr_play.msg_rec_max; i++) {
                        switch (i) {
                            case 1:
                                fileNameListintro.push({
                                    'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_1.wav', 
                                    'varname': 'm'
                                });
                                break;
                            case 2:
                                fileNameListintro.push({
                                    'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_2.wav', 
                                    'varname': 'n'
                                });
                                break;
                            case 3:
                                fileNameListintro.push({
                                    'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_3.wav', 
                                    'varname': 'o'
                                });
                                break;
                            case 4:
                                fileNameListintro.push({
                                    'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_4.wav', 
                                    'varname': 'p'
                                });
                                break;
                            case 5:
                                fileNameListintro.push({
                                    'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_5.wav', 
                                    'varname': 'q'
                                });
                                break;
                            case 6:
                                fileNameListintro.push({
                                    'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_6.wav', 
                                    'varname': 'r'
                                });
                                break;
                            case 7:
                                fileNameListintro.push({
                                    'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_7.wav', 
                                    'varname': 's'
                                });
                                break;
                            case 8:
                                fileNameListintro.push({
                                    'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_8.wav', 
                                    'varname': 't'
                                });
                                break;
                            case 9:
                                fileNameListintro.push({
                                    'file': '/var/lib/asterisk/sounds/en/custom/record_msg_prompt_9.wav', 
                                    'varname': 'u'
                                });
                        }
                    }
                    
                    
                    var filename = '';
                    for (var i = 0, len = fileNameListintro.length; i < len; i++) {
                        filename += fileNameListintro[i].varname
                    }
                    var msgarray = [obj_ivr_play.msg_rec_num, fileNameListintro, 'intro_' + job_num + '_' + filename + '.wav'];
                    callback(msgarray);
                }).catch(function (err) {});
     
            }
            
            //dtmf function 
            function ondtmf_sc(event, channel) {
                console.log(event.digit);
                console.log("IVR dtmf event");
                console.log(channel.id);
                function stop_playback(dtmfin, callback) {
                    if (dtmfin != '#') {
                        //stop loop playback for intro 
                        obj_ivr_play.intro_ivr_play_current_indx = -1;
                        console.log('stop play back');
                        if (obj_ivr_play.ivrmenu != 1) {
                            playbackIVR.stop(function (err) {
                                if (err) {}
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
                    fileNameListintro_tolisten = 
            
                        [{
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
                            concat_audio_func_arr(fileNameListintro_tolisten, '/var/lib/asterisk/sounds/en/custom/' + 'dtmf_' + job_num + '_' + filename + '.wav', function (yn) {
                                callback('dtmf_' + job_num + '_' + filename);
                            });
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
                        
                        //reset list array
                        fileNameListintro = 
                            
                            [{
                                'file': '/var/lib/asterisk/sounds/en/custom/intro_msg1.wav', 
                                'varname': 'a'
                            }, 
               
                            {
                                'file': '/var/lib/asterisk/sounds/en/custom/b_', 
                                'varname': 'b'
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
                            }];

                        obj_ivr_play.ivrmenu = 0;
                        obj_ivr_play.last_good_dtmf = digit_dtmf;

                        getjobinfo_ivr(job_num, job_name, function (msg_arr) {
                            console.log(msg_arr[1]);
                            obj_ivr_play.concat_intro = msg_arr[2];
                            fs.stat('/var/lib/asterisk/sounds/en/custom/' + obj_ivr_play.concat_intro, function (err, stat) {
                                if (err == null) {
                                    console.log('File exists');
                                    channel.play({ media: 'sound:custom/' + obj_ivr_play.concat_intro.replace('.wav', '') }, playbackIVR).then(function (playback) {
                                    }).catch(function (err) {
                                        obj_ivr_play.intro_ivr_play_current_indx = -1;
                                        console.log(err);
                                        console.log('Error Playback ivr');
                                    });
                                } else if (err.code == 'ENOENT') {
                                    console.log('no  file')
                                    concat_audio_func_arr(msg_arr[1], '/var/lib/asterisk/sounds/en/custom/' + msg_arr[2], function (yn) {
                                        channel.play({ media: 'sound:custom/' + obj_ivr_play.concat_intro.replace('.wav', '') }, playbackIVR).then(function (playback) { })
                                        .catch(function (err) {
                                            obj_ivr_play.intro_ivr_play_current_indx = -1;
                                            console.log(err);
                                            console.log('Error Playback ivr');
                                        });
                                    });
                                } else {
                                    console.log('Some other error: ', err.code);
                                }
                            });
                            
                            obj_ivr_play.intro_ivr_play_current_indx = 0;
                            console.log('getting ready already rec here ' + obj_ivr_play.concat_intro);
                            obj_ivr_play.ivrmenu = 0;
                        });

                    } else if (reckey.indexOf(digit_dtmf) >= 0 && obj_ivr_play.ivrmenu == 0 && (parseInt(digit_dtmf)||99) <= parseInt(obj_ivr_play.msg_rec_max)   ) {
                        obj_ivr_play.last_good_dtmf = digit_dtmf;
                        //recording success yes no
                        obj_ivr_play.rec_yn = 0;
                        obj_ivr_play.ivrmenu = 1;
                        obj_ivr_play.current_msg_rec_edit = digit_dtmf;

                        //recording 
                        if (obj_ivr_play.rec_arr.indexOf(job_num + '_' + job_name.replace(/ /g, '_') + "_" + digit_dtmf) >= 0 && skipcheck == 0) {
                            obj_ivr_play.ivrmenu = 1;
                            obj_ivr_play.rec_yn = 1;
                            obj_ivr_play.rec_type = 'overwrite';
                            obj_ivr_play.current_msg_rec_edit = digit_dtmf;
                            dtmfhandle('#', 0);
                        } else {
                            channel.play({ media: "sound:custom/recstart_b" }, playbackIVR).then(function (playback) {
                               // console.log('Play Back IVR : recordatendpress_pnd');
                                playback.once('PlaybackFinished', function (event, playback) {
                                    //record audio   
                                    ari_ivr.channels.record({
                                        channelId: channel.id,
                                        format: 'wav',
                                        name: job_num + '_' + job_name.replace(/ /g, '_') + "_" + digit_dtmf,
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
                                                trimaudio_func('/var/spool/asterisk/recording/' + job_num + '_' + job_name.replace(/ /g, '_') + "_" + digit_dtmf, 1, parseInt(event.recording.duration) - 1);
                                            }
                                        });
                                    }).catch(function (err) {
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
                            channel.play({ media: 'sound:custom/' + varback }, playbackIVR).then(function (playback) { }).catch(function (err) { console.log(err); console.log('Listen 1 error'); });
                        });
                     
                    } else if (obj_ivr_play.ivrmenu == 3) {
                        //listen menu 
                        channeloutivr.removeListener('ChannelDtmfReceived', ondtmf_sc);

                        channel.play({ media: 'recording:' + job_num + '_' + job_name.replace(/ /g, '_') + "_" + digit_dtmf }, playbackIVR).then(function (playback) {
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
                    });
                }
            }
            channeloutivr.on('ChannelDtmfReceived', ondtmf_sc);

            //Main play back finished loop event. 
            function on_playback_finished(event) {
                console.log(obj_ivr_play.intro_ivr_play_current_indx);
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
             //dial out procedure test
            getjobinfo_ivr(job_num, job_name, function (msg_arr) {
                console.log(msg_arr[2]);
                console.log(msg_arr[0]);
                console.log(msg_arr[1]);
                obj_ivr_play.concat_intro = msg_arr[2];
                fs.stat('/var/lib/asterisk/sounds/en/custom/' + obj_ivr_play.concat_intro, function (err, stat) {
                    if (err == null) {
                        console.log('File exists');
                    } else if (err.code == 'ENOENT') {
                        
                        console.log('no  file')
                        concat_audio_func_arr(msg_arr[1], '/var/lib/asterisk/sounds/en/custom/' + msg_arr[2], function (yn) { });
                    } else {
                        console.log('Some other error: ', err.code);
                    }
                });
                
                channeloutivr.originate({ endpoint: 'SIP/' + ivrsipgway + '/1' + dialoutnum, app: 'smivrout', appArgs: 'dialed', callerId: '3862710666', variables: { socket : socket.id } }).then(function (channel) {
                    fn(channel.id);
                    channel.once('ChannelStateChange', function (event, channel) {
                        console.log(event);
                        console.log('state change');


                    });
                    
                    
                    function ivr_startplay() {
                        channel.play({ media: 'sound:custom/' + msg_arr[2].replace('.wav', '') }, playbackIVR).then(function (playback) {
                        }).catch(function (err) {
                            obj_ivr_play.intro_ivr_play_current_indx = -1;
                            console.log('Error Playback ivr');
                        });
                     }

                    //intro 
                    channeloutivr.on('StasisStart', function (event, channel) {
                        console.log('StasisStart')
                        socket.emit('ivr_status_msg', '<span class="text-success">In IVR</span>');
                        obj_ivr_play.ivrmenu = 0;
                        console.log('Playing file' + msg_arr[2].replace('.wav', ''));
                        setTimeout(ivr_startplay, 800);
                    });
                    //start of IVR pick up 
                    socket.emit('ivr_status_msg', '<span class="text-warning">Dialing Out</span>');
                });
            });
        });
    });

};


var Start_uplineclear = function (client)
{

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
            client.channels.hangup(
                { channelId: bid },
                    function (err) { //console.log(err) 
                }
            );
                    
        }
    });
}

//ARI client connect    'Dispo to DB confirmation to success'

/*UNCOMMENTPROD
client.connect('http://devacd.datapex.com:8088', 'screstuser', '960f643cb2ab2467bc24366bcb7703eb', clientLoadedv2).then(function (client) {
    
    console.log('Start up Connect to ARI WebSocket Connection');
    

    //clear lines on start up remove when coding 
    Start_uplineclear(client);
    
    active_chan_func = function active_chancount(callback) {
        var chancount_ag = 0;
        var loopcount_cb = 0;
        var active_chansock_arr = [];

        client.channels.list().then(function (channels) {
            var chanrealcount = channels.length;
            if (chanrealcount != 0)
                {
            for (var i in channels) {
                    if (channels[i].name.indexOf('GW1') != -1) {
                        chancount_ag += 1;
                    }
                client.channels.getChannelVar({
                    channelId: channels[i].id,
                    variable: 'socket'
                    }).then(function (variable) {
                        if (indexOf(variable.value) == -1) {
                            active_chansock_arr.push(variable.value);
                        }
                        console.log('active array : ' + active_chansock_arr);

                        loopcount_cb += 1;
                        if (loopcount_cb == chanrealcount) {
     
                            callback(chancount_ag, active_chansock_arr);
                        }

                    }).catch(function (err) {
                        loopcount_cb += 1;
                        if (loopcount_cb == chanrealcount) {
                            callback(chancount_ag, active_chansock_arr);
                        }
                    });                
            

              
            }
     

            } else {
                callback(0, active_chansock_arr);
            }

        }).catch(function (err) {
            callback(0, active_chansock_arr);
        });
    };
    
    //queue chech with call back 
    function queue_rec_fn(callback) {
        console.log('Queue check');
       // console.log(objuserinfo.conuserinfo_main);
        //inbound queue check 
        var agentqueue_check_ct = 0;
        var agent_ct = Object.keys(objuserinfo.conuserinfo_main).length || 0;
        active_chan_func(function (chancount, actvchan_skt_array) {
           console.log('Active @ chan count :' + chancount);
            if (chancount < 3) {
                if (typeof objuserinfo.conuserinfo_main !== 'undefined' && agent_ct != 0) {
                    for (var outkey in objuserinfo.conuserinfo_main) {
                        if (objuserinfo.conuserinfo_main[outkey].chanout == '' && objuserinfo.conuserinfo_main[outkey].agentstatus == 'Available' && objuserinfo.conuserinfo_main[outkey].disconnect == 0) {
                            getdialrec_main_cb(outkey, function (ret_contact_wk) {
                                agentqueue_check_ct += 1;
                                if (agent_ct == agentqueue_check_ct) {
                                    callback();
                                }
                            });
                        } else {
                            if (objuserinfo.conuserinfo_main[outkey].disconnect == 1 && objuserinfo.conuserinfo_main[outkey].chanout == '') {
                                
                                if (findinarrbysocket(outkey) == -1 && actvchan_skt_array.indexOf(outkey) == -1) {
                                    console.log('delete from array');
                                    if (objuserinfo.conuserinfo_main[outkey])
                                        {
                                        delete objuserinfo.conuserinfo_main[outkey];
                                    }
                                }
                                
                                agentqueue_check_ct += 1;
                                if (agent_ct == agentqueue_check_ct) {
                                    callback();
                                }
                            } else {
                                
                                console.log('Search agent call Chan Out no record to give or not availible: ' + outkey + ' Check Time : ' + moment().format());
                                agentqueue_check_ct += 1;
                                if (agent_ct == agentqueue_check_ct) {
                                    callback();
                                }
                            }
                        }
                    }
                } else {
                    callback();
                }
            } else {
                callback();
            }
        });
  
    };
    
    //check email send every 10 sec
    function wait4queue_rec() {
        setTimeout(function () {
            queue_rec_fn(wait4queue_rec);
        }, 4000);
    }

    //start queue send update 
    queue_rec_fn(wait4queue_rec);
    
  
    //on connect v2 of agent function attach listiner to agent socket if Dialer connected to ARI 
    io.on('connection', function (socket) {

        console.log('Agent Login Socket.io Connection : ' + socket.id);
        //Connection to agent button 
        socket.on('connectbtn', function (testvar, endptinput, user_wk, cb) {
            var siptype = 'SIP';
            objuserinfo.conuserinfo_main[socket.id].chan = ''
            objuserinfo.conuserinfo_main[socket.id].extension = endptinput;
            objuserinfo.conuserinfo_main[socket.id].un = endptinput;
            objuserinfo.conuserinfo_main[socket.id].online_user_wk = user_wk;
            var channel = client.Channel();

            console.log(siptype + '/' + endptinput);
            channel.originate({ endpoint: siptype + '/' + endptinput , app: 'hello-world', callerId : endptinput, timeout : 60, variables : { socket : socket.id} }).then(function (channel) {
                socket.emit('agentchanout', channel.id);
                //Get Agent Channel Id 
                objuserinfo.conuserinfo_main[socket.id].chan = channel.id;
                channel.once('ChannelDestroyed', function (event, channel) {
                    cb(-1);
                });
                channel.once('StasisStart', function (event, channel) {
                    channel.answer().then(function () {
                        cb(channel.id);
                    }).catch(function (err) { console.log(err); cb(-1); });
                });
            }).catch(function (err) { console.log(err);  cb(-1); });
        });
        
        //dispo button 
        socket.on('dispobtn', function (socketid, dispoin, dispocodein, talk, wrap, cbt, contact_type_in, att_wk_in, contact_wk, emailaddr, email_body,  fn) {
                updatedisplay(socket.id, 'la_ct', function (infoback) {
                socket.emit('agentdisplayinfo', objuserinfo.conuserinfo_main[socket.id] || '');
            });
            
   


            db.updatedisporec(att_wk_in, socket.id, contact_type_in, dispoin, dispocodein, talk, wrap , cbt, '*@', '*', emailaddr, email_body, contact_wk ).then(function (data) {
                //clear dial data
                clearmainsocketobj(socket.id);
                if (objuserinfo.conuserinfo_main[socket.id])
                {
                objuserinfo.conuserinfo_main[socket.id].agentstatus = 'Available';
                }
                //get dial infomation for afte dispo
                //emit message of success
                socket.emit('flashsrvmsg', 'Successful Disposition', 'Dispo Record', 'assets/ico/png/finger-touching-tablet-screen.png', 'green');
                fn('Dispo to DB confirmation to success');
            }).catch(function (err) {
                console.log(err);
                console.log('Update dispo error');
                fn('Dispo to DB confirmation to fail');
            });
        });
        
        //Agent chat status button class update  
        socket.on('statusbtn', function (socketid, jsonval) {
            
            console.log(jsonval);
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
   
                   insert_track_fn(socket, 11, function (tracking) { });
                } else {
 
 
                    insert_track_fn(socket, 3,  function (tracking) { });
                    if (typeof objuserinfo.dialinfo[socket.id] !== 'undefined' && typeof objuserinfo.dialinfo[socket.id][0] !== 'undefined') {
                        //console.log('sent back');
                        //givedialrecback(objuserinfo.dialinfo[socket.id][0].contact_wk, socket.id);

                    }
                }
            }
        });
        
        
        //dial new return 
        socket.on('dialbtn', function (testvar, dialinput, sipgateway, callerid, cb) {

   insert_track_fn(socket, 9, function (tracking) { });

            objuserinfo.conuserinfo_main[socket.id].agentstatus = 'out';
            updatedisplay(socket.id, 'c_ct', function (infoback) {
                socket.emit('agentdisplayinfo', objuserinfo.conuserinfo_main[socket.id]);
            });
            var channeloutvar = '';
            var bridge = client.Bridge();
            //ring on dial button start
            client.channels.ring({ channelId: objuserinfo.conuserinfo_main[socket.id].chan })
            .then(function () { }).catch(function (err) { console.log('error on ring')});
            bridge.create({ type: 'mixing' })
           .then(function (bridge) {
                //place bridge in socket
                objuserinfo.conuserinfo_main[socket.id].bridge = bridge.id;
                //add agent channel to bridge
                return bridge.addChannel({ channel: objuserinfo.conuserinfo_main[socket.id].chan });
            }).then(function () {
                var channelout = client.Channel();
                return channelout.originate({ endpoint: 'SIP/' + sipgateway + '/1' + dialinput, app: 'hello-world', appArgs: 'dialed', timeout : 60, callerId: callerid, variables: { socket : socket.id } });
            }).then(function (channel) {
                objuserinfo.conuserinfo_main[socket.id].lastdialtime = d.toLocaleString();
                objuserinfo.conuserinfo_main[socket.id].current_att_phone = dialinput;
                objuserinfo.conuserinfo_main[socket.id].current_att_wk = 0;
                objuserinfo.conuserinfo_main[socket.id].chanout = channel.id;
            
                db.insertattrec(objuserinfo.conuserinfo_main[socket.id], objuserinfo.dialinfo[socket.id][0], 'SCO').then(function (data) {
                    //after insert tag record in obj with current attempt_wk 
                    objuserinfo.conuserinfo_main[socket.id].current_att_wk = data.att_wk;
                    add_dial_listen(socket, channel, objuserinfo.conuserinfo_main[socket.id].chan, objuserinfo.conuserinfo_main[socket.id].bridge, objuserinfo.conuserinfo_main[socket.id].current_att_wk, client, function (backvar) {
                        
                        console.log('!#back from db# att!');
                        cb(objuserinfo.conuserinfo_main[socket.id].chanout, objuserinfo.conuserinfo_main[socket.id].bridge, objuserinfo.conuserinfo_main[socket.id].chan, objuserinfo.conuserinfo_main[socket.id].current_att_wk );
                    });
                }).catch(function (err) { console.log(err) });
            }).catch(function (err) {
                client.channels.ringStop({ channelId: objuserinfo.conuserinfo_main[socket.id].chan }).then(function () { }).catch(function (err) { console.log('ring stop err'); });
                socket.emit('flashsrvmsg', 'Hang Up', 'Error on dial out ', 'assets/ico/png/telephone-receiver-with-circular-arrows.png', 'blue');
                db.insertattrecerr(objuserinfo.conuserinfo_main[socket.id], objuserinfo.dialinfo[socket.id][0], 'SCO', '666').then(function (data) {
                    //after insert tag record in obj with current attempt_wk 
                    objuserinfo.conuserinfo_main[socket.id].current_att_wk = data.att_wk;
                    cb(objuserinfo.conuserinfo_main[socket.id].chanout , objuserinfo.conuserinfo_main[socket.id].bridge , objuserinfo.conuserinfo_main[socket.id].chan, objuserinfo.conuserinfo_main[socket.id].current_att_wk);
                    socket.emit('hanguponuser', socket.id);
                    objuserinfo.conuserinfo_main[socket.id].agentstatus = 'dispo';
                    //chan out dial clear 
                    objuserinfo.conuserinfo_main[socket.id].chanout = '';
                    console.log('!#back from db# att error!');
                   
                });

            });



        });

        //Play button audio file  new 
        socket.on('playbtn', function (socket_in, currentbridge, currentchannelout, currentagentchannel, contact_wk, att_wk_in, msg_path_in) {
            console.log('playing on file on start :' + currentbridge);
            //push into leave alone on hang up message array 
            objuserinfo.scmsgleave[currentchannelout] = { sktid : socket_in, bri : currentbridge, chan : currentchannelout, dispo : 'SCM', contact_wk : contact_wk, dispowk : 5, att_wk : att_wk_in };
            

            //mute channel on play back of smart contact message
            client.channels.mute({ channelId: currentagentchannel, direction : 'in' }).then(function () { console.log('mute chan') }).catch(function (err) { console.log('mute channel err'); });
            

            //add to call count 
            updatedisplay(socket.id, 'smc_ct', function (infoback) {
             socket.emit('agentdisplayinfo', socket_in);
            });

            
            client.bridges.play({ bridgeId: currentbridge, media: msg_path_in}).then(function (playback) {
                playback.on('PlaybackFinished', function (event, playback) {
                    client.bridges.destroy({ bridgeId: currentbridge }).then(function () {
                        client.channels.hangup({ channelId: currentchannelout }).then(function () { }).catch(function (err) { console.log('playback hang up destory') });
                    }).catch(function (err) { console.log('playback bridge destory error') });
           
                });
                
                
                //drop agent off bridge after 2 seconds ?? may not work in multi env
                setTimeout(function () {
                    //get new record after drop off bridge 
                    //chan out dial clear 
                    
                    if (objuserinfo.conuserinfo_main[socket.id].chanout)
                    {
                    objuserinfo.conuserinfo_main[socket.id].chanout = '';
                    objuserinfo.conuserinfo_main[socket.id].agentstatus = 'Available';
                    }

                    //unmute channel on play back of smart contact message
                    client.channels.unmute({ channelId: currentagentchannel, direction : 'in' }).then(function () { console.log('un mute chan') }).catch(function (err) { console.log('mute channel err'); });
                    
                    console.log('remove from bridge ' + currentbridge);
                    console.log('remove chanc from chan ' + currentagentchannel);

                                client.bridges.removeChannel({ bridgeId: currentbridge, channel : currentagentchannel }).then(function () {
                                    console.log('bridge remove');
                                }).catch(function (err) { console.log('bridge remove err'); });
                              
                        
                }, 2000);
            }).catch(function (err) { console.log('bridge play error'); console.log(err) });

        });

        //on hang up button 
        socket.on('hangupbtn', function (socketid, chan_out, ag_chan) {
            //get channel from socket 
            //hang up on channel 
            console.log('Hang up On Channel : ' + chan_out);
            client.channels.ringStop({ channelId: ag_chan }).then(function () { }).catch(function (err) {
                console.log('Ring stop err hang up btn Channel : ' + ag_chan);
            });
            client.channels.hangup({ channelId: chan_out }).then(function () {
                if (objuserinfo.conuserinfo_main[socket.id]) {
                    objuserinfo.conuserinfo_main[socket.id].chanout = '';
                }

            }).catch(function (err) {
                if (objuserinfo.conuserinfo_main[socket.id]) {
                    objuserinfo.conuserinfo_main[socket.id].chanout = '';
                }
            });
              
    });

        //appt day request 
        socket.on('appt_day_req', function (skillid, dt, fn) {
            db.app_day_display(skillid, dt).then(function (data) {
                fn(data);
            }).catch(function (err) {
                fn('');
            });
        });

        //appt dow request render 
        socket.on('appt_dow_req', function (skillid, fn) {
            db.app_monthview_display(skillid).then(function (data) {
                fn(data);
            }).catch(function (err) {
                fn('');
            });
        user_activity_info
        
        
        });
        
        //on disconnect button not used for now
        socket.on('discconnbtn', function (testvar) {
            //hang up on channel 
            client.channels.hangup({ channelId: objuserinfo.conuserinfo_main[socket.id].chan }).then(function () { }).catch(function (err) {});

        });

        //on disconnect of agent 
        socket.on('disconnect', function () {
            if (typeof objuserinfo.conuserinfo_main[socket.id] !== 'undefined') {
                //get channel from socket before remove from array 
         insert_track_fn(socket, 7,  function (tracking) { }); 
                //hang up on agent channel
                if (objuserinfo.conuserinfo_main[socket.id]) {
                    client.channels.hangup(
                        { channelId: objuserinfo.conuserinfo_main[socket.id].chan }
                    ).then(function () {
                  //  console.log('Hang up on ag chan' + objuserinfo.conuserinfo_main[socket.id].chan )
                    }).catch(function (err) { 
            
                        //console.log('ERR Hang up on ag chan' + objuserinfo.conuserinfo_main[socket.id].chan)
                    });
                }
                objuserinfo.conuserinfo_main[socket.id].agentstatus = 'logout';
                objuserinfo.conuserinfo_main[socket.id].disconnect = 1;
                //don't delete object see if this is where crash happens 
               // delete objuserinfo.conuserinfo_main[socket.id];
            } else {
                    insert_track_fn(socket, 2,  function (tracking) { }); 
  
 
                console.log('Non Agent socket disconnect' + socket.id);
            }
        });

    });

}).catch(function (err) { console.log(err) });
*/




//on connect v2 of agent for non agent functionality ie.chat etc
io.on('connection', function (socket) {
    
    //csv upload load
    db.uploadcsvxls(socket);
    
    
    //update socket with info 
    
    socket.socket_dialinfo = { ag_chan: '', out_chan: '', ag_status : '', out_bridge : '', disconnected : 0, skill_wk : 0 };
    

    //corr digital portal 
    socket.on('corrauth', function (un, pass, fn) {
        db.logincheckcorr(un, pass).then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
            fn(0);
        });
    });
    
    
    
    
    
    
    socket.on('add_dealers_corr', function (obj_in, fn) {
        db.dealer_add_db_sc(obj_in).then(function (data) {
            
            fn(data);
        }).catch(function (err) {
            console.log(err)
            fn(err);
        });
    });
    
    
    socket.on('add_users_corr', function (obj_in, fn) {
        db.user_add_db_sc(obj_in).then(function (data) {
            
            fn(data);
        }).catch(function (err) {
            console.log(err)
            fn(err);
        });
    });


    
    //corr dealer routing
    socket.on('getdealers_corr', function (fn) {
        db.dealercorr_db().then(function (data) {
       
            fn(data);
        }).catch(function (err) {
            console.log(err)
            fn(err);
        });
    });
    

    //generic email out routine
    socket.on('email_out', function (email_addrs, filenamein, pdf_est, emailbody, user_wk, fn) {
       db.email_log_db({ email_addrs : email_addrs, estimate_key : filenamein, email_body : emailbody, pdf_est : pdf_est, user_wk : user_wk }).then(function (data) {console.log(data);}).catch(function (err) {console.log(err);});
        email_to_Send_obj =
              {
            from: '"' + "Corr Wrap Order" + '" <' + 'CorrWrapOrder@corrdigital.com' + '>', // sender address
            to: email_addrs, // list of receivers
            subject: "Corr Wrap Order - " + filenamein, // Subject line        
            text: "Corr Wrap Order - " + filenamein, // plaintext body
            html: "<html><body>NEW ! Corr Wrap Order - " + filenamein + '<BR>' + emailbody + '</table></body></html>' , // html body
            cc : 'randolph.herron@realsmartcontact.com;nicole.tropea@realsmartcontact.com;nick.wyrick@realsmartcontact.com;justinia.abinette@corrdigital.com;crystal.franklin@corrdigital.com;kim.chomic@corrdigital.com;kelly.lemoine@corrdigital.com;loyd.grant@corrdigital.com;charmaine.wilson@corrdigital.com;',
            attachments: [{
                    filename: "Corr Wrap Order - " + filenamein + '.pdf',
                    content: new Buffer(pdf_est, 'base64'),
                    contentType: 'application/pdf'
                }]
        };

        mail_sync.sendmail_gen(email_to_Send_obj, function (email_status) {
            console.log(email_status);
            fn(email_to_Send_obj);
        });

    });
    
    //generic email out routine
    socket.on('email_out_corr_user', function (email_addrs, from_addr, subject, emailbody, fn) {
        
        email_to_Send_obj =
              {
           // from: '"' + "Corr Wrap New User" + '" <' + 'CorrWrapOrder@corrdigital.com' + '>', // sender address
            from : from_addr,
            to: email_addrs, // list of receivers
            subject: subject, // Subject line        
            text: subject, // plaintext body
            cc : 'randolph.herron@realsmartcontact.com;nicole.tropea@realsmartcontact.com;nick.wyrick@realsmartcontact.com;justinia.abinette@corrdigital.com;crystal.franklin@corrdigital.com;kim.chomic@corrdigital.com;kelly.lemoine@corrdigital.com;loyd.grant@corrdigital.com',
            html: '<html><body>NEW ! New Corr Wrap user !' + '<BR><BR>' + emailbody + '</table></body></html>' 
        };
        
        
        
        mail_sync.sendmail_gen(email_to_Send_obj, function (email_status) {
            console.log(email_status);
            fn(email_to_Send_obj);
        });

    });
    
    
    socket.on('copy_dir_readskill', function (skill_wk, skill_name_in, new_skill, cb)
        {
            fs.readdir("/var/spool/asterisk/recording/", function (err, items) {
  
            var incopyfiles = items.filter(function (itin) { return itin.startsWith(skill_wk + '_') }) ;
            var counttocopy = (incopyfiles || []).length;

                if ((incopyfiles || []).length !=0) { 
                    
                for (var i in incopyfiles) {
                    val = incopyfiles[i];
                   fs.createReadStream("/var/spool/asterisk/recording/" + val).pipe(fs.createWriteStream("/var/spool/asterisk/recording/" + new_skill + '_' + skill_name_in.replace(/ /g, "_") + '_' + val.split("_")[val.split("_").length - 1] )).on('close', function () {
                        counttocopy -= 1;
                        console.log(counttocopy);
                        
                        
                        fs.chown("/var/spool/asterisk/recording/" + new_skill + '_' + skill_name_in.replace(/ /g, "_") + '_' + val.split("_")[val.split("_").length - 1], 499, 498, function (err) {
                            if (err) { return console.error(err); }
                        });

                        if (counttocopy == 0) { 
                            console.log('hello');
                           cb(1);
                        }



                    }).on('error', function (err) {
                        had_error = true;
                        cb(0);
                    });;
                 

                }
                }else {cb(0)}
            
            
            //fs.createReadStream('test.log').pipe(fs.createWriteStream('newLog.log'));
            

            //cb(items);
    });
  
    
    });
    
    
    socket.on('copy_camp_sc', function (camp_wk, camp_name, fn) {
        
        db.copy_camp_db(camp_wk, camp_name).then(function (data) {
            console.log(data);
            fn(data)
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });;

    });


    socket.on('get_biz_unitz', function (fn) {
        
        db.bzunit_db().then(function (data) {
            console.log(data);
            fn(data)
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });;

    });
    
    
    
    socket.on('update_biz_unitz', function (objin, fn) {
        
        db.update_biz_up_db(objin).then(function (data) {
            console.log(data);
            fn(data)
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });;

    });
    
    
    socket.on('add_biz_unitz', function (objin, fn) {
        
        db.add_biz_up_db(objin).then(function (data) {
            console.log(data);
            fn(data)
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });;

    });
    



    socket.on('disconnect', function () {

        objuserinfo.logintrack_obj = objuserinfo.logintrack_obj.filter(function (obj) {
            return obj.socketid !== socket.id;
        });

    });

    
    socket.on('user_edit_update', function (user_obj, fn) {
        db.user_edit_update(user_obj).then(function (data) {
            fn(data);
        }).catch(function (err) {
            
            console.log(err);
            fn(-1);
        });
    });
    
    
    socket.on('user_activity_info', function (user_obj, reptype, st_dt, end_dt, fn) {
        db.user_act_db(user_obj, reptype, st_dt, end_dt).then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });
    });
    
   
    socket.on('campaign_perf', function (bix_unit, st_dt, end_dt, att_in, fn) {
        db.campaign_perfdb(bix_unit, st_dt, end_dt, att_in).then(function (data) {
            fn(data);
           // console.log(data);
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });
    });
    
    
    
    socket.on('attempt_perf', function (bix_unit, st_dt, end_dt, statusin, fn) {
        db.attempt_perfdb(bix_unit, st_dt, end_dt, statusin).then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });
    });
    
    
    socket.on('user_insert_record', function (user_obj, fn) {
        db.insert_single_record(user_obj).then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });
    });
    

    
    socket.on('edit_biz_rulez', function (editupdatecamp, fn) {
        db.edit_biz(editupdatecamp).then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });
    });

    

    socket.on('get_biz_unitcampaign', function (bizunit, fn) {
       
        

        db.getuser_mgmt_db(bizunit).then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });
    });

    
    socket.on('user_edit_update_modal', function (user_obj, fn) {
        db.user_edit_update_modal_db(user_obj).then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });
    });
    
    socket.on('user_onbehalfinsert', function (user_obj, fn) {
        db.user_onbehalfinsert(user_obj).then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });
    });

    
    
    
    socket.on('user_edit_display_user', function (biz_unit, fn) {
        
   
        db.user_edit_display_userdb(biz_unit).then(function (data) {
            
            fn(data);
            
        }).catch(function (err) {
            
            console.log(err);
            fn(-1);
        });
    });
    

    
    socket.on('user_edit_display', function (online_user_wk, biz_unit, fn) {
        db.user_edit_display(online_user_wk, biz_unit).then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });
    });
    

    //enrollment inserts 
    socket.on('insert_campaign', function (user_new_camp_obj, fn) {
        //campaign db insert 
        db.campaign_insert(user_new_camp_obj.business_unit_wk, user_new_camp_obj.license_type, user_new_camp_obj.campaign_name.trim(), user_new_camp_obj.campaign_name.trim()).then(function (data) {
        
            //get dial infomation for afte dispo
            var skill_wk = data[0];
            if (typeof skill_wk != "undefined") {
                fn(data[0].skill_wk);
            } else {
                fn(-1);
            }
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });
    });

    socket.on('update_campaign', function (user_new_camp_obj, uptype, fn) {
       
        if (uptype == 1) {
            //campaign db insert 
            db.campaignupdate_sql(user_new_camp_obj).then(function (data) {
                console.log(data);
                //get dial infomation for afte dispo
                var skill_wk = data[0];
                if (typeof skill_wk != "undefined") {
                    fn(data[0].skill_wk);
                } else {
                    fn(-1);
                }
            }).catch(function (err) {
                console.log(err);
                fn(-1);
            });
        } else if (uptype = 2) {
            db.campaignupdate_all_sql(user_new_camp_obj).then(function (data) {
                console.log(data);
                //get dial infomation for afte dispo
                var skill_wk = data[0];
                if (typeof skill_wk != "undefined") {
                    fn(data[0].skill_wk);
                } else {
                    fn(-1);
                }
            }).catch(function (err) {
                console.log(err);
                fn(-1);
            });
        }
    });
     
    socket.on('insert_appt_dt', function (appt_object_in, fn) {
            //campaign db insert 
        db.insert_appt_dates(appt_object_in).then(function (data) {
            console.log(data);
            fn(1)
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });;

    });
    
    socket.on('insert_apptdow_modal', function (appt_object_in, tz_dur_in, fn) {
        
        appt_object_in.map(function (el) { el.skill_wk = tz_dur_in[0]; });
        
        //campaign db insert 
        db.insert_appt_dow_editmodaldb(appt_object_in, tz_dur_in).then(function (data) {
            console.log(data);
            fn(1)
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });
    

    });
    

    socket.on('insert_appt_dates_spect_dow', function (appt_object_in, fn) {
        //campaign db insert 
        db.insert_appt_dates_spect_dow_db(appt_object_in).then(function (data) {
            console.log(data);
            fn(1)
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });;

    });
    
    
    
    
    
    
    
    
    socket.on('update_script_camp', function (inobj, fn) {
        //campaign db insert 
        db.update_script_campdb(inobj).then(function (data) {
            console.log(data);
            fn(1)
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });

    });



    socket.on('insert_emails', function (mail_object_in, fn) {
        //campaign db insert 
        db.insert_emails_db(mail_object_in).then(function (data) {
            console.log(data);
            fn(1)
        }).catch(function (err) {
            console.log(err);
            fn(-1);
        });;

    });

    socket.on('zip_weather', function (zip, fn) {
        //weather by zip code
        getweather_zip(zip, function (openweather_res) {
            fn(openweather_res);
        });
    });

    //responder remove 
    socket.on('rem_respond', function (contact_wk, online_user_wk, fn) {
        db.rem_respond_db(contact_wk, online_user_wk).then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
        });
    });

    //timezone to zip code 
    //var tz = zipcode_to_timezone.lookup('32174');
    //console.log(tz);
    //update appointment  record info
    socket.on('update_appt_info', function (recinfoobj, fn) {
        db.updateappt_rec(recinfoobj).then(function (data) {
            console.log(data);
            fn(data);
        }).catch(function (err) {
            console.log(err);
        });
    });

    //update record info
    socket.on('update_rec_info', function (recinfoobj, fn) {
        db.updaterecinfo_db(recinfoobj).then(function (data) {
            console.log(data);
            fn(data);
        }).catch(function (err) {
            console.log(err);
        });
    });

    //dialog record info 
    socket.on('modal_rec_info', function (contact_wk, fn) {
        db.recinfo_contact_db(contact_wk)
                         .then(function (data) {
            console.log(data);
            fn(data);
        }).catch(function (err) {
            console.log(err);
        });
    });
    
    

    
    
    //drill down display 
    socket.on('disp_drilldown', function (drill_obj, fn) {
        db.drill_downdb(drill_obj)
                .then(function (data) {
            fn(data);}).catch(function (err) {
            console.log(err);
        });
    });

    
    //drill down display 
    socket.on('disp_drilldown_att', function (drill_obj, fn) {
        db.drill_downdb_att(drill_obj)
                .then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
        });
    });


    //campaign responder display 
    socket.on('disp_responder', function (bis_unit, skillid, st_dt_rsp, end_dt_rsp, fn) {
        db.responder_display(bis_unit, skillid.replace(/[|,]/g, ","), st_dt_rsp, end_dt_rsp)
                .then(function (data) {
            fn(data);}).catch(function (err) {
            console.log(err);
        });
    });

    //campaign responded display 
    socket.on('disp_responded', function (bis_unit, skillid, st_dt_rpd, end_dt_rpd, fn) {
        db.responded_display(bis_unit, skillid.replace(/[|,]/g, ","), st_dt_rpd, end_dt_rpd)
    .then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
        });
    });
    
    //campaign appointment display test
    socket.on('disp_appt', function (bis_unit, skillid, st_dt_appt, end_dt_appt, fn) {
        db.appt_dt_display(bis_unit, skillid.replace(/[|,]/g, ","), st_dt_appt, end_dt_appt)
            .then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
        });
    });
    
    //campaign ivr display 
    socket.on('disp_camp', function (bis_unit, fn) {
        db.campaign_display(bis_unit).then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
        });
    });
    
    //campaign ivr display 
    socket.on('disp_camp_comp', function (bis_unit, fn) {
        db.campaign_completed_display(bis_unit)
    .then(function (data) {
            fn(data);
        }).catch(function (err) {
            console.log(err);
        });
    });
    
    
    //chat send button
    socket.on('chatbtnsend', function (chatinput, inname) {
        console.log("User click chat button to send :  " + chatinput);
        console.log(inname);
        io.emit('chatclient', chatinput, socket.id.replace('/#', ''), inname);
    });

    d = new Date();
    var socketstr = socket.id.replace('/#', '');
   

    //if socket id not already in array 
    if (typeof objuserinfo.conuserinfo_main[socket.id] == 'undefined' && typeof socket.request._query['fromsc'] == 'undefined') {
        //push into array on connection **
        
        
       
        insert_track_fn(socket, 6,  function (tracking) { console.log('tracking'); console.log(tracking) });


        objuserinfo.conuserinfo_main[socket.id] = { useridsock: socketstr , extension: socket.request._query['end_point_ext'], name : socket.request._query['first_name'] + ' ' + socket.request._query['last_name'], un : socket.request._query['end_point_ext'], pass : socket.request._query['pwd'] , userlevel : '', connecttime: d.toLocaleString(), lastchattime : '', lastdialtime : '', chan : '', bridge: '', agentstatus : 'Disconnected', chatstatus : 'Away', chanout : '', online_user_wk : socket.request._query['online_user_wk'], current_att_phone : '', current_att_dnis : '', current_att_wk : '', current_contact_type : '', skills_wks : socket.request._query['skills'], c_ct : 0, smc_ct : 0 , la_ct : 0, vm_ct : 0, disconnect : 0 };
    } else {
        //clear dial data
        //clearmainsocketobj(socket.id);
        console.log(socket.id + ' : already in array or non agent login if = 4 : | clearing socket information' + socket.request._query['user_type_wk']);
        console.log(socket.request._query['fromsc']);
        

        insert_track_fn(socket, 1,  function (tracking) { console.log('tracking'); console.log(tracking) });
       



    }

    objuserinfo.logintrack_obj.push({ socketid : socket.id, user_wk : socket.request._query['online_user_wk'] });
       
});

// handler for stasisStart event
function stasisStart(event, channel) {
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



//ADD MAIN DIAL LISTENERS
function add_dial_listen(socket, channel, channel_ag_in, bridge_in, att_wk_in, client, callback) {
    addinside = function startinside(cb) {
        dialstasisStart(socket, channel, channel_ag_in, bridge_in, att_wk_in, client);
        dialChannelDestroyed(socket, channel, channel_ag_in, bridge_in, att_wk_in, client);
        dialChannelHangupRequest(socket, channel, channel_ag_in, bridge_in, att_wk_in, client);
        cb(1);
    };
    addinside(function () { 
        callback(1);
    })
            
}



function dialstasisStart(socket, channel_in, channel_ag_in, bridge_in, att_wk_in, client) {
    console.log('here low#####');
    //dialstasisStart
    //Get Agent Channel Id 
    channel_in.once('StasisStart', function (event, channel) {
        console.log('*StasisStart of outbound channel var:' + channel_in.id);
        //emit to show play btn
        socket.emit('playbtnshow_svr', 'showplay');

        client.bridges.get({ bridgeId: bridge_in})
        .then(function (bridge) {
            return bridge.addChannel({ channel: channel_in.id });
        }).then(function () {
            console.log('ring stop');
                  return client.channels.ringStop ({ channelId: channel_ag_in});            
        }).catch(function (err) {
            client.channels.ringStop ({ channelId: channel_ag_in}).then(function () { }).catch(function (err) { });;  
            socket.emit('flashsrvmsg', 'Hang Up', 'Error on stasis start :' + channel.name, 'assets/ico/png/telephone-receiver-with-circular-arrows.png', 'blue');
            socket.emit('hanguponuser', socket.id);

        });
    });
                        

}



function dialChannelDestroyed(socket, channel, channel_ag_in, bridge_in, att_wk_in, client) {
    channel.once('ChannelDestroyed', function (event, channel) {
        
      //  socket.emit('flashsrvmsg', 'Hang Up', 'Call Ended Destoryed :' + channel.name, 'assets/ico/png/telephone-receiver-with-circular-arrows.png', 'blue');
        //delete if smart contact done. 
        if (typeof objuserinfo.scmsgleave[channel.id] != "undefined") {
            
            

            db.updatedisporec(objuserinfo.scmsgleave[channel.id].att_wk, socket.id, 'SCO', -Math.abs(objuserinfo.scmsgleave[channel.id].dispowk), objuserinfo.scmsgleave[channel.id].dispo, 0, 0, '', event.cause, channel.id,'', '','').then(function (data) {
                //after update attempt remove record in obj for leave message     
                console.log('delete ' + channel.id + 'from message array');
                if (objuserinfo.scmsgleave[channel.id]) {
                    delete objuserinfo.scmsgleave[channel.id];
                }
            }).catch(function (err) { console.log('udpate db error') });


        } else {
            socket.emit('hanguponuser', socket.id);
            client.channels.ringStop({ channelId: channel_ag_in }).then(function () { }).catch(function (err) { console.log('ring stop err'); });
            //chan out dial clear 
            
            
            insert_track_fn(socket, 10,  function (tracking) { });

            objuserinfo.conuserinfo_main[socket.id].agentstatus = 'dispo';
            objuserinfo.conuserinfo_main[socket.id].chanout = '';
            db.updatedisporec(att_wk_in, socket.id, 'SCO', 0, 0, 0, 0, '', event.cause, channel.id,'', '','').then(function (data) {
                //after update attempt remove record in obj for leave message     
                console.log('udpate end date of call');
            }).catch(function (err) { console.log('udpate db erro') });
        }
    });
}


function dialChannelHangupRequest(socket, channel, channel_ag_in, bridge_in, att_wk_in, client) {
    channel.once('ChannelHangupRequest', function (event, channels) {
        socket.emit('flashsrvmsg', 'Hang Up', 'Call Ended Hang up :' + channel.name, 'assets/ico/png/telephone-receiver-with-circular-arrows.png', 'blue');
        if (objuserinfo.conuserinfo_main[socket.id])
            {
          if (objuserinfo.conuserinfo_main[socket.id].chanout == channel.id) {
            client.channels.ringStop(
                { channelId: channel_ag_in})
                                .then(function () { }).catch(function (err) {
                    console.log(err);
                    
                    console.log('ring stop err');
                });
             }
        }


        if (typeof objuserinfo.scmsgleave[channels.id] === "undefined") {
                            client.bridges.destroy({ bridgeId: bridge_in }).then(function () { }).catch(function (err) { console.log('Bridge destroy error'); });
        }
        
        if(objuserinfo.conuserinfo_main[socket.id])
           {
        if (channel.id == objuserinfo.conuserinfo_main[socket.id].chanout && typeof objuserinfo.scmsgleave[channel.id] === "undefined") {
            console.log('send hang up real');
            socket.emit('hanguponuser', socket.id);
            objuserinfo.conuserinfo_main[socket.id].agentstatus = 'dispo';
            //chan out dial clear 
            objuserinfo.conuserinfo_main[socket.id].chanout = '';
        } else { console.log('NOTsend hang up'); }
        }


    });

}

//inbound 

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
        
        db.insertattrecinb(objuserinfo.inbinfo[channel.id], 'SCI').then(function (data) {
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
                            }).then(function (playback) {
                                // make channel obj ready for call and stop play back 
                                objuserinfo.inbinfo[channel.id].ready = 1;
                            }).catch(function (err) { console.log('channel not found to play hold'); });
                        });
                    }).catch(function (err) { console.log('Intro Hold play error') });
                }).catch(function (err) { console.log('Channel ans inbound error') });
            });
        } 
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
                            console.log(err);
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



//yahoo shit 


function yahooSearch(consumerKey, consumerSecret, query, count, callback_error_data_response) {
    var webSearchUrl = 'https://query.yahooapis.com/v1/public/yql';
    var finalUrl = webSearchUrl + '?q=' + encodeURIComponent(query) + '&format=json'
    var oa = new OAuth(webSearchUrl, webSearchUrl, consumerKey, consumerSecret, "1.0", null, "HMAC-SHA1");
    oa.setClientOptions({ requestTokenHttpMethod: 'GET' });
    oa.getProtectedResource(finalUrl, "GET", '', '', callback_error_data_response);
};

function ysql_search_pull(pulltype, zip, socketid) {
    var sockid = socketid;
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
//yahoo shit end 







RSS bull shit

//reporrrs updates
function rsstoxml(url, done) {
    return request(url, function (error, resp, body) {
        var opts;
        opts = {
            siteTags: ['title', 'description', 'date', 'link', 'author'],
            itemTags: ['title', 'description', 'summary', 'date', 'link', 'author', 'media:content', 'media:description', 'image', 'meta', 'enclosures' , 'categories', 'permalink', 'link']
        };
        return parser(body, opts, function (error, ret) {
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
                io.to(socketidin).emit('yqlnews', datanews3, datanews2, datanews1);
            });
        });
    });
}

function sendinbagcall(channelid, client) {
    //search for agents to answer 
    for (var key in objuserinfo.conuserinfo_main) {
        if (typeof objuserinfo.inbinfo[channelid] !== "undefined") {
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
                objuserinfo.conuserinfo_main[key].survey = objuserinfo.inbinfo[channelid].survey;
                objuserinfo.conuserinfo_main[key].surveyqa = objuserinfo.inbinfo[channelid].surveyqa;
                objuserinfo.conuserinfo_main[key].surveyans = objuserinfo.inbinfo[channelid].surveyans;
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

    
//yahoo app key
//My AppsTrustbuilder
//Client ID(Consumer Key)
//dj0yJmk9MXI1WDYzaXRYbmVSJmQ9WVdrOVlYTmhNMFJETjJjbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD1lYg--
//Client Secret(Consumer Secret)
//4ec400d36092c47fed6cea21431c215aa8b90b26

}//rrs bullshit



//inbound 


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
//inbound 



// old ivr 
// handler for IVR ARI client being loaded
function IVRclientLoaded(err, ari_ivr) {
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
            db.updatedb_audio(audio_job_arr_obj).then(function (data) {
            }).catch(function (err) {
                console.log(err);
                console.log('recdump audio error');
            });
        });
    }
    setInterval(function () {
        load_db_audio();
    }, 10000);
    
    
    io.on('connection', function (socket) {
        socket.on('call_ivr_hangup', function (channelin) {
            ari_ivr.channels.hangup({
                channelId: channelin
            }).then(function () {
                console.log('Hang up on IVR');
            }).catch(function (err) { });
        });
        
        
        //socket.on('load_audio', function (job_num, fn) {
        //    var audio_job_arr_obj = [];
        //    ari_ivr.recordings.listStored().then(function (storedrecordings) {
        //        storedrecordings.forEach(function (rec_file, idx) {
        //            if (rec_file.name.startsWith(job_num + '_') == true) {
        
        //                var audio_job_obj = {};
        //                audio_job_obj.audioname = rec_file.name;
        //                data = fs.readFile("/var/spool/asterisk/recording/" + rec_file.name + ".wav", function (err, data) {
        //                    if (err) { console.log(err) };
        //                });
        //                audio_job_obj.encodeb64out = data.toString('base64');
        //                audio_job_obj.msg_num = rec_file.name.split("_")[rec_file.name.split("_").length - 1];
        //                audio_job_arr_obj.push(audio_job_obj);
        //            }
        //        });
        //        fn(audio_job_arr_obj);
        //    });
        //});
        
        //v1
        socket.on('call_ivr', function (jobnum_in, campname_in, phonenum_in, max_att_in, fn) {
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
            obj_ivr_play.msg_rec_max = max_att_in;
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
                    obj_ivr_play.intro_ivr_play.push('record_key_1');
                    // 'record_msg_prompt_1', 'record_msg_prompt_2', 'record_msg_prompt_3', 'record_msg_prompt_4', 'record_msg_prompt_5', 'record_msg_prompt_6', 'record_msg_prompt_7', 'record_msg_prompt_8', 'record_msg_prompt_9'
                    //here randy to have the ivr read the correct message numbers to record
                    for (i = 1; i <= obj_ivr_play.msg_rec_max; i++) {
                        obj_ivr_play.intro_ivr_play.push('record_msg_prompt_' + i);
                    }
                    console.log(obj_ivr_play.intro_ivr_play);
                    callback(obj_ivr_play.msg_rec_num);
                }).catch(function (err) { });
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
                        obj_ivr_play.last_good_dtmf = digit_dtmf
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
                                console.log('Play Back IVR : recordatendpress_pnd');
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
                        channel.play({ media: "sound:custom/to_listen_1", skipms: 0 }, playbackIVR).then(function (playback) {
                            console.log('to listen play');
                            playback.once('PlaybackFinished', function (event, playback) {
                                channel.play({ media: "sound:custom/b_" + obj_ivr_play.current_msg_rec_edit, skipms: 0 }, playbackIVR).then(function (playback) {
                                    playback.once('PlaybackFinished', function (event, playback) {
                                        channel.play({ media: "sound:custom/after_rec_2" , skipms: 0 }, playbackIVR).then(function (playback) { }).catch(function (err) { console.log('Error Playback ivr listen or recrecord'); });

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
            
            playbackIVR.on("PlaybackFinished", on_playback_finished);
            
            function on_playback_finished(event) {
                console.log(obj_ivr_play.intro_ivr_play_current_indx)
                
                if (obj_ivr_play.intro_ivr_play_current_indx < obj_ivr_play.intro_ivr_play.length - 1 && obj_ivr_play.intro_ivr_play_current_indx != -1) {
                    obj_ivr_play.intro_ivr_play_current_indx += 1;
                    console.log('Playing file : ' + obj_ivr_play.intro_ivr_play[obj_ivr_play.intro_ivr_play_current_indx]);
                    channeloutivr.play({ media: 'sound:custom/' + obj_ivr_play.intro_ivr_play[obj_ivr_play.intro_ivr_play_current_indx] , skipms: 0 }, playbackIVR).then(function (playback) {
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
                
                channel.play({ media: 'sound:custom/' + 'intro_msg1' , skipms: 0 }, playbackIVR).then(function (playback) {

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
            
            //intro 
            
            //dial out procedure
            getjobinfo_ivr(job_num, job_name, function (msg_already_rec) {
                
                console.log('getting ready already rec' + msg_already_rec);
                
                channeloutivr.originate({ endpoint: 'SIP/' + ivrsipgway + '/1' + dialoutnum, app: 'smivrout', appArgs: 'dialed', timeout : 30, callerId: '3862771102', "variables": { 'userobj': "Alice" } }).then(function (channel) {
                    
                    fn(channel.id);
                    channel.once('ChannelStateChange', function (event, channel) { });
                    
                    socket.emit('ivr_status_msg', '<span class="text-warning">Dialing Out</span>');
                    console.log('ivr dial out' + channel.id);
                });

    
            });
    


        });
    });

    
   

};
// old IVR



//old save file routin 
socket.on('save_file', function (file_name_wav, blob_wav, filenamesave, fn) {
    
    var buf = new Buffer(blob_wav.blob, 'base64'); // decode
    fs.writeFile("sc/useraudio/" + filenamesave + ".wav", buf, function (err) {
        if (err) {
            console.log("err", err);
        } else {
            console.log('saved success');
            fn(true);
        }
    });
});


//old save file routin 



//inobund

//inbound call populate 
socket.on('inbcall', function (did, callinfoobj, callerinfo) {
    
    //   console.log(callinfoobj);
    console.log(callinfoobj.surveyans);
    
    // show buttons for survey engine 
    
    
    $('.navsrv_ul').css('display', function (index) {
        
        $('.intro_srv_btns').show();
        
        return 'inline-block';
    });
    
    
    current_user_srv.srv_user = callinfoobj.survey[0];
    current_user_srv.srv_qst = callinfoobj.surveyqa;
    current_user_srv.srv_ans = callinfoobj.surveyans;
    current_user_srv.skill_wk = callinfoobj.skill_wk;
    current_user_srv.skill_tz = callinfoobj.skill_tz;
    current_user_srv.appt_dow = callinfoobj.appt_dow;
    current_user_srv.appt_st = callinfoobj.appt_dt_st;
    current_user_srv.appt_end = callinfoobj.appt_dt_end;
    current_user_srv.contact_tz = callinfoobj.contact_tz;
    
    
    console.log(callinfoobj.surveyqa);
    
    $('.outboundrecordinfo').hide(function () {
        $('.inboundrecordinfo').show();
    });
    
    timercall.start();
    $('.norecord').hide(function () {
        
        $('.inbcallindicator').fadeIn(700).fadeOut(700).fadeIn(700).fadeOut(700);

    });
    
    
    
    //populate inbound call info dispostions 
    populatedispo(callinfoobj.dispo_db_display, function (callbackvar) {
        $('.dispobox').click(function () {
            
            if ($(this).is(":checked")) {
                var group = "input:checkbox[name='" + $(this).attr("name") + "']";
                $(group).prop("checked", false);
                $(this).prop("checked", true);

            } else {
                $(this).prop("checked", false);
            }
        });
    });
    
    
    $(".statusdialbtn").prop("disabled", true);
    
    
    $('.statusdialbtn').css('background-color', '#4BA84B')
    $('.statusdialbtn').html('<i class="fa fa-chevron-down" style="border-right-style: solid;padding-right:10px"></i> <i class="' + $(this).parent().find('i').attr('class') + '"></i> ' + 'On Call' + '</a> ');
    $(".hangupbtncls").show();
    
    
    
    console.log('inbcall info');
    console.log(callinfoobj);
    
    
    $('.td_rec_ani').html(callerinfo.number.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'));
    $('.td_rec_name').html(callerinfo.name);
    $('.td_rec_did').html(did.substring(1, 11).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'));
    
    $('.td_rec_addr').html('<a href="#" id="rec_addr" class="editz"></a>');
    $('.td_rec_city').html('<a href="#" id="rec_addr" class="editz"></a>');
    $('.td_rec_state').html('<a href="#" id="rec_addr" class="editz"></a>');
    $('.td_rec_zip').html('<a href="#" id="rec_addr" class="editz"></a>');
    $('.td_rec_company').html('<a href="#" id="rec_company" class="editz"></a>');
    $('.td_rec_wp').html('<a href="#" id="rec_wp" class="editz"></a>');
    $('.td_rec_hp').html('<a href="#" id="rec_hp" class="editz"></a>');
    $('.td_rec_cp').html('<a href="#" id="rec_cp" class="editz"></a>');
    $('.td_rec_biz').html('<a href="#" id="rec_biz" class="editz""></a>');
    
    
    
    
    $('.editz').editable();
    $('#user .editable').editable('toggleDisabled');
    
    $('.dialinp').val(callerinfo.number);
    
    
    $('.skilldispname').html(callinfoobj.skill_name);
    
    
    $('.classinoutindicator').removeClass('fa-phone-square').removeClass('green-font').removeClass('red-font').removeClass("fa-arrow-up").removeClass("fa-arrow-down").addClass("fa-arrow-down").addClass("red-font");
    
    
    
    $('#srv_take').html('<h2>' + callinfoobj.survey[0].srv_yes_script + '</h2> <br /><span style="font-size:22px;font-weight:bold; border-right :1px solid black;padding-right:15px" class="text-warning"> Agent Prompt </span><span style="font-size:22px;padding-left:15px" class="text-danger agent_prompt" >' + callinfoobj.survey[0].srv_yes_prompt + '</span>');
    
    $('#srv_refused').html('<h2>' + callinfoobj.survey[0].srv_refused_message + '</h2> <br /><span style="font-size:22px;font-weight:bold; border-right :1px solid black;padding-right:15px" class="text-warning"> Agent Prompt </span><span style="font-size:22px;padding-left:15px" class="text-danger agent_prompt" >' + callinfoobj.survey[0].srv_refused_prompt + '</span>');
    
    $('#srv_leftmessage').html('<h2>' + callinfoobj.survey[0].srv_left_message + '</h2> <br /><span style="font-size:22px;font-weight:bold; border-right :1px solid black;padding-right:15px" class="text-warning"> Agent Prompt </span><span style="font-size:22px;padding-left:15px" class="text-danger agent_prompt" >' + callinfoobj.survey[0].srv_dnc_prompt + '</span>');
    
    $('#srv_dnc').html('<h2>' + callinfoobj.survey[0].srv_dnc_message + '</h2> <br /><span style="font-size:22px;font-weight:bold; border-right :1px solid black;padding-right:15px" class="text-warning"> Agent Prompt </span><span style="font-size:22px;padding-left:15px" class="text-danger agent_prompt" >' + 'Read Message when answering machine picks up' + '</span>');
    
    $('#srv_intro_div').html('<h2>' + callinfoobj.survey[0].srv_intro_script.replace(/\[agent\]/g, callinfoobj.name).replace(/\[name\]/g, callerinfo.name).replace(/\[company\]/g, 'Unknown for now') + '</h2><br /><span style="font-size:22px;font-weight:bold; border-right :1px solid black;padding-right:15px" class="text-warning"> Agent Prompt </span><span style="font-size:22px;padding-left:15px" class="text-danger agent_prompt" >' + callinfoobj.survey[0].srv_intro_prompt + '</span>').show();
    
    
    
    $('.srv_qst_display_order').html('Survey Intro');
    
    $('.srv_name_class').html('Survey - <span style="color:#3E9C1A">' + current_user_srv.srv_user.srv_name + '</span><span style="font-weight:bold"> - ' + current_user_srv.srv_user.contact_type_description + '</span>');
    //Hello my name is <agent> I am calling on behalf of <company> may I please speak to <name> ?
    
    
    
    $('.trustMnuhide').hide();
    $('.dialnumbtncls').hide();
    $('.dialinp').prop('disabled', true);



});
//inobund


//dial button old 


//Dial button
socket.on('dialbtn_old', function (testvar, dialinput, sipgateway, callerid, cb) {
    console.log('caller id :' + callerid);
    
    
    objuserinfo.conuserinfo_main[socket.id].agentstatus = 'out';
    
    console.log('dial button pressed');
    updatedisplay(socket.id, 'c_ct', function (infoback) {
        socket.emit('agentdisplayinfo', objuserinfo.conuserinfo_main[socket.id]);
    });
    
    var channeloutvar = '';
    var bridge = client.Bridge();
    
    
    //ring on dial button start
    client.channels.ring({ channelId: objuserinfo.conuserinfo_main[socket.id].chan }).then(function () { }).catch(function (err) { console.log('ring start err'); });
    
    
    
    //create bridge for call on dial 
    bridge.create({ type: 'mixing' }).then(function (bridge) {
        
        //place bridge in socket
        objuserinfo.conuserinfo_main[socket.id].bridge = bridge.id;
        
        
        
        
        //add agent channel to bridge
        bridge.addChannel({ channel: objuserinfo.conuserinfo_main[socket.id].chan }).then(function () {
            
            var channelout = client.Channel();
            
            //Orginate outbound call 
            //revisded dial out SIP/5269573987GW1/1, PJSIP/1000
            channelout.originate({ endpoint: 'SIP/' + sipgateway + '/1' + dialinput, app: 'hello-world', appArgs: 'dialed', timeout : 60, callerId: callerid, 'variables': { 'CALLERID(name)': 'Smart C', 'outtype' : 'outcall' } }).then(function (channel) {
                
                
                objuserinfo.conuserinfo_main[socket.id].lastdialtime = d.toLocaleString();
                objuserinfo.conuserinfo_main[socket.id].current_att_phone = dialinput;
                objuserinfo.conuserinfo_main[socket.id].current_att_wk = 0;
                objuserinfo.conuserinfo_main[socket.id].chanout = channel.id;
                
                //new channel for dial out 
                
                //write attempt outbound to database 
                console.log('dialout to db');
                
                channel.once('ChannelDestroyed', function (event, channel) {
                    
                    socket.emit('flashsrvmsg', 'Hang Up', 'Call Ended Destoryed :' + channel.name, 'assets/ico/png/telephone-receiver-with-circular-arrows.png', 'blue');
                    //delete if smart contact done. 
                    if (typeof objuserinfo.scmsgleave[channel.id] != "undefined") {
                        db.updatedisporec(objuserinfo.scmsgleave[channel.id].att_wk, socket.id, 'SCO', -Math.abs(objuserinfo.scmsgleave[channel.id].dispowk), objuserinfo.scmsgleave[channel.id].dispo, 0, 0, '', event.cause, channel.id).then(function (data) {
                            //after update attempt remove record in obj for leave message     
                            console.log('delete ' + channel.id + 'from message array');
                            if (objuserinfo.scmsgleave[channel.id]) {
                                delete objuserinfo.scmsgleave[channel.id];
                            }

                        }).catch(function (err) { console.log('udpate db erro' + err) });


                    } else {
                        
                        socket.emit('hanguponuser', socket.id);
                        objuserinfo.conuserinfo_main[socket.id].agentstatus = 'dispo';
                        client.channels.ringStop({ channelId: objuserinfo.conuserinfo_main[socket.id].chan }).then(function () { }).catch(function (err) { console.log('ring stop err'); });
                        
                        //chan out dial clear 
                        objuserinfo.conuserinfo_main[socket.id].chanout = '';
                        
                        db.updatedisporec(objuserinfo.conuserinfo_main[socket.id].current_att_wk, socket.id, 'SCO', 0, 0, 0, 0, '', event.cause, channel.id).then(function (data) {
                            //after update attempt remove record in obj for leave message     
                            console.log('udpate end date of call');
                        }).catch(function (err) { console.log('udpate db erro' + err) });
                    }
                });
                
                channel.once('ChannelHangupRequest', function (event, channels) {
                    
                    
                    socket.emit('flashsrvmsg', 'Hang Up', 'Call Ended Hang up :' + channel.name, 'assets/ico/png/telephone-receiver-with-circular-arrows.png', 'blue');
                    
                    client.channels.ringStop(
                        { channelId: objuserinfo.conuserinfo_main[socket.id].chan })
                                .then(function () { }).catch(function (err) { console.log('ring stop err'); });
                    
                    
                    
                    
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
                        //chan out dial clear 
                        objuserinfo.conuserinfo_main[socket.id].chanout = '';
                    } else { console.log('NOTsend hang up'); }


                });
                //dialstasisStart
                //Get Agent Channel Id 
                channel.once('StasisStart', function (event, channel) {
                    console.log('*StasisStart of outbound :' + objuserinfo.conuserinfo_main[socket.id].bridge);
                    console.log('*StasisStart of outbound channel var:' + channel.id);
                    
                    //emit to show play btn
                    console.log('show play btn');
                    socket.emit('playbtnshow_svr', 'showplay');
                    client.bridges.get({ bridgeId: objuserinfo.conuserinfo_main[socket.id].bridge })
                                      .then(function (bridge) {
                        
                        bridge.addChannel({ channel: objuserinfo.conuserinfo_main[socket.id].chanout }).then(function () { })
                                            .catch(function (err) { console.log('Bridge add channel err'); });
                        client.channels.ringStop(
                            { channelId: objuserinfo.conuserinfo_main[socket.id].chan })
                                .then(function () { }).catch(function (err) { console.log('ring stop err'); });
                    }).catch(function (err) { });
                });
                
                
                db.insertattrec(objuserinfo.conuserinfo_main[socket.id], objuserinfo.dialinfo[socket.id][0], 'SCO').then(function (data) {
                    //after insert tag record in obj with current attempt_wk 
                    objuserinfo.conuserinfo_main[socket.id].current_att_wk = data.att_wk;
                    
                    
                    //call back with hang up and drop info
                    cb(objuserinfo.conuserinfo_main[socket.id].chanout, objuserinfo.conuserinfo_main[socket.id].bridge, objuserinfo.conuserinfo_main[socket.id].chan);

                }).catch(function (err) { console.log(err) });
                
                console.log('After Outbound * :' + objuserinfo.conuserinfo_main[socket.id].chanout);


            }).catch(function (err) { console.log('add channel err'); });




        }).catch(function (err) { console.log('create bridge error add channel err'); });
    });


});




//play btn old

//Play button audio file   
socket.on('playbtn_old', function (socket_in, currentbridge, currentchannelout, currentagentchannel) {
    
    console.log('playing on file on start :' + currentbridge);
    io.emit('servermessages', 'Play Button Presed ' + socket_in , 'ui');
    
    
    //add to call count 
    updatedisplay(socket.id, 'smc_ct', function (infoback) {
        
        console.log('then display info call func info' + infoback);
        socket.emit('agentdisplayinfo', socket_in);
            
    });
    
    var playback = client.Playback();
    
    //on play get ids incase dial fast dial 
    var current_bridgevar = objuserinfo.conuserinfo_main[socket.id].bridge;
    var current_chanoutvar = objuserinfo.conuserinfo_main[socket.id].chanout;
    var current_agchan = objuserinfo.conuserinfo_main[socket.id].chan;
    
    //push into leave alone on hang up message array 
    objuserinfo.scmsgleave[currentchannelout] = { sktid : socket.id, bri : currentbridge, chan : currentchannelout, dispo : 'SCM', contact_wk : objuserinfo.dialinfo[socket.id][0].contact_wk, dispowk : 5, att_wk : objuserinfo.conuserinfo_main[socket.id].current_att_wk };
    
    //mute channel on play back of smart contact message
    client.channels.mute({ channelId: currentagentchannel, direction : 'in' }).then(function () { console.log('mute chan') }).catch(function (err) { console.log('mute channel err'); });
    
    client.bridges.play({ bridgeId: currentbridge, media: objuserinfo.dialinfo[socket.id][0].sc_msg_path }).then(function (playback) {
        
        
        
        playback.on('PlaybackFinished', function (event, playback) {
            client.bridges.destroy({ bridgeId: currentbridge }).then(function () {
                client.channels.hangup({ channelId: currentchannelout }).then(function () { }).catch(function (err) { });
            }).catch(function (err) { client.channels.hangup({ channelId: currentchannelout }).then(function () { }).catch(function (err) { }); });
           
        });
        
        
        
        
        //drop agent off bridge after 2 seconds ?? may not work in multi env
        setTimeout(function () {
            //get new record after drop off bridge 
            //  getdialrec_main(socket.id);
            //unmute channel on play back of smart contact message
            client.channels.unmute({ channelId: currentagentchannel, direction : 'in' }).then(function () { console.log('un mute chan') })
                                            .catch(function (err) { console.log('mute channel err'); });
            
            console.log('remove from bridge ' + currentbridge);
            console.log('remove chanc from chan ' + currentagentchannel);
            client.bridges.get({ bridgeId: currentbridge }).then(function (bridge) {
                
                //chan out dial clear 
                objuserinfo.conuserinfo_main[socket.id].chanout = '';
                objuserinfo.conuserinfo_main[socket.id].agentstatus = 'Available';
                if (typeof bridge !== 'undefined') {
                    if (typeof bridge.channels[0] !== 'undefined' && typeof bridge.channels[1] !== 'undefined') {
                        client.bridges.removeChannel({ bridgeId: currentbridge, channel : currentagentchannel }).then(function () {
                        }).catch(function (err) { console.log(err) });
                    }
                }
                
            }).catch(function (err) {
                console.log(err);
                objuserinfo.conuserinfo_main[socket.id].chanout = '';
                objuserinfo.conuserinfo_main[socket.id].agentstatus = 'Available';
                if (typeof bridge !== 'undefined') {
                    if (typeof bridge.channels[0] !== 'undefined' && typeof bridge.channels[1] !== 'undefined') {
                        client.bridges.removeChannel({ bridgeId: currentbridge, channel : currentagentchannel }).then(function () {
                        }).catch(function (err) { console.log(err) });
                    }
                }
            });
        }, 2000);
                

    }).catch(function (err) {
        client.channels.unmute({ channelId: currentagentchannel, direction : 'in' }).then(function () { console.log('un mute chan') })
                                            .catch(function (err) { console.log('mute channel err'); });
        
        
        client.bridges.destroy({ bridgeId: currentbridge }).then(function () {
            client.channels.hangup({ channelId: currentchannelout }).then(function () { }).catch(function (err) { });
        }).catch(function (err) { client.channels.hangup({ channelId: currentchannelout }).then(function () { }).catch(function (err) { }); });
    });
            
     
            


});


        
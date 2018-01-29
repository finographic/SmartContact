var pg = require('pg');
// instantiate a new client
// the client will read connection information from
// the same environment variables used by postgres cli tools
var validator = require('validator');
var zipcode_to_timezone = require('zipcode-to-timezone');
//var alasql = require('.alasql\node_modules\alasql\dist\alasql-worker.js');
const csv=require('csvtojson', 
    {
    trim: true, 
    workerNum: 2
});

var SocketIOFileUpload = require('socketio-file-upload')
var config = {
    host: 'devacd.datapex.com',
    port: 5432,
    user: 'dbroot',
     password: '*',
    database: 'smartcontact',
    max: 50, // max number of clients in the pool
    idleTimeoutMillis: 5, 
};


//pgpromise 
var pgp = require('pg-promise')();
var pgdb = pgp(config);




exports.pool_db = new pg.Pool(config);


var dealer_add_db = " INSERT INTO corr_wrap_client(first_name, last_name, companyname, phone_number, c_addr, c_city, c_state, c_zip, c_url_logo,  user_ct_wk) "
dealer_add_db += " select  ${f_name},  ${l_name}, ${companyname_d}, ${phone},   ${addr},  ${city},  ${state}, ${zip},  ${url_logo},  ${crt_wk}  returning  wrap_client_wk  "

exports.dealer_add_db_sc = function (add_obj) {
    return pgdb.one(dealer_add_db, add_obj);
}


var usercorr_add_db = "INSERT INTO corr_users_online(first_name, last_name, email_addr, phone, user_name,  pwd, client_wk, user_type,user_ct_wk) "
usercorr_add_db += " select  ${f_name},  ${l_name}, ${email}, ${phone}, ${un},   ${pwd},  ${wrapclient_wk}, 1,  ${crt_wk} returning  wrap_user_wk  "

exports.user_add_db_sc = function (add_obj) {
    
    
    return pgdb.one(usercorr_add_db, add_obj);
}





var email_log_add_db = "INSERT INTO corr_wrapest_log(email_addrs, estimate_key, email_body, pdf_est, user_wk) "
email_log_add_db += " select  ${email_addrs},  ${estimate_key}, ${email_body}, ${pdf_est}, ${user_wk} returning  wrap_est_wk  "

exports.email_log_db = function (email_addobj) {
    
    
    return pgdb.one(email_log_add_db, email_addobj);
}





//coor login query
var loginquerycorr = '';
loginquerycorr += ' select wrap_user_wk, corr_users_online.first_name, corr_users_online.last_name, corr_users_online.email_addr, companyname , c_url_logo, user_type, corr_users_online.phone, c_addr , c_city, c_state, c_zip, phone number   from corr_users_online  '
loginquerycorr += ' join corr_wrap_client on corr_users_online.client_wk = corr_wrap_client.wrap_client_wk  '
loginquerycorr += ' where  user_name = $1 and pwd = $2 LIMIT 1  '


exports.logincheckcorr = function (username, password) {
    return pgdb.one({ text: loginquerycorr, values: [username, password] });
}


var dealercorr = " select  companyname , (trim(c_addr) || ', ' || trim(c_city) || ', ' || trim(c_state)  || ', ' || trim(c_zip)) as addr, wrap_client_wk  from corr_wrap_client ";
exports.dealercorr_db = function () {
    return pgdb.manyOrNone(dealercorr);
}



var bzunit_db_sql = " select business_unit_wk biz_wk,  business_name bzname, business_addr || ',' || business_city || ',' ||  business_state || ',' ||  business_zip bzaddr, primary_contact_phone bzphone, trim(business_addr) business_addr , trim(business_city) business_city , trim(business_state)  business_state ,  trim(business_zip) business_zip, business_primary_contact bzccname, primary_contact_email ccemail from sc_business_unit ";
exports.bzunit_db = function () {
    return pgdb.manyOrNone(bzunit_db_sql);
}





var copy_camp_sql = " select copy_campaign($1, $2)";
exports.copy_camp_db = function (skill_copy_wk, skill_copy_in) {
    return pgdb.manyOrNone({ text: copy_camp_sql , values : [skill_copy_wk, skill_copy_in] });
}


exports.drill_downdb_att = function (drill_obj) {
    
    
    drill_obj.reptype =    drill_obj.reptype.replace('lap', 'la');

    var drilldown_sql = " select * from uvw_drilldown where business_unit_wk = ${bizunit}  "
    
    if (drill_obj.att == 0) {
        drilldown_sql += ' and COALESCE(attempt_log_attempts,0) in (0,1) '
    } else {

        drilldown_sql += ' and COALESCE(attempt_log_attempts,0) = ${att} '

    }
    if (drill_obj.lvl == 'skill') {
        drilldown_sql += ' and skill_wk = ${var_wkin} '
    } 
  
    if ((drill_obj.att != 0))
        {

    
    
    if (drill_obj.reptype == 'resp') {
        drilldown_sql += ' and resp = 1 '
    } else {
        drilldown_sql += ' and reptype = ${reptype} '

    }
    }
    console.log('hello 1');
  console.log(drilldown_sql)
    return pgdb.manyOrNone(drilldown_sql, drill_obj);
}



exports.drill_downdb = function (drill_obj) {
    
    console.log(drill_obj);
    var drilldown_sql = " select * from uvw_drilldown where business_unit_wk = ${bizunit}  "
    var calc_array = ['sum', 'sumcall','nocall'];
    if ((calc_array.indexOf(drill_obj.reptype) != -1) ) {
        if (drill_obj.att == 1 && drill_obj.reptype == 'sum') {
            drilldown_sql += ' and COALESCE(attempt_log_attempts,0) in (0,1) '
        }else if(drill_obj.att > 1 && drill_obj.reptype == 'sum') {
            drilldown_sql += ' and ((COALESCE(attempt_log_attempts,0) = ${att}) or (COALESCE(attempt_log_attempts,0) = ${att}-1  and nocall = 1))'
        }
        if (drill_obj.reptype == 'sumcall') {
            drilldown_sql += ' and COALESCE(attempt_log_attempts,0) = ${att} '
        }
        if (drill_obj.reptype == 'nocall' && drill_obj.att == 1 ) {
            drilldown_sql += ' and COALESCE(attempt_log_attempts,0) = 0 '
        }else if (drill_obj.reptype == 'nocall' && drill_obj.att > 1) {
            drilldown_sql += ' and COALESCE(attempt_log_attempts,0) = ${att}-1 and nocall = 1 '
        }
    } else {
        
        if (drill_obj.reptype == 'resp') {
            drilldown_sql += ' and COALESCE(attempt_log_attempts,0) = ${att} and resp = 1 '
        } else if (drill_obj.reptype == 'nocall') {
            drilldown_sql += ' and COALESCE(attempt_log_attempts,0) = ${att} and nocall = 1 '
        } else { 
            drilldown_sql += ' and COALESCE(attempt_log_attempts,0) = ${att} and reptype = ${reptype} ' 
        }
    }
    if (drill_obj.lvl == 'skill') { 
        drilldown_sql += ' and skill_wk = ${var_wkin} '
    } 
    
    if (drill_obj.lvl == 'user') {
        var user_wk = drill_obj.var_wkin.split('|')[0];
        var skill_wk = drill_obj.var_wkin.split('|')[1];
        drilldown_sql += ' and skill_wk = ' + skill_wk + ' and online_user_wk = ' + user_wk + '::text';
    }


    return pgdb.manyOrNone(drilldown_sql, drill_obj);
}





//update scirp 
var biz_add_db = "INSERT INTO sc_business_unit(business_name, business_addr, business_city,business_state, business_zip, business_primary_contact, primary_contact_email, primary_contact_phone) "
biz_add_db += " select  ${bzname},  ${business_addr}, ${business_city}, ${business_state}, ${business_zip},   ${bzccname},  ${ccemail},  ${bzphone} returning  business_unit_wk  "


exports.add_biz_up_db = function (addbiz_obj) {
    
    return pgdb.one(biz_add_db, addbiz_obj);
}



//update scirp 
var biz_up_db = " update sc_business_unit set "
biz_up_db += " business_name = ${bzname}, "
biz_up_db += " business_addr = ${business_addr}, "
biz_up_db += " business_city = ${business_city}, "
biz_up_db += " business_state = ${business_state}, "
biz_up_db += " business_zip = ${business_zip}, "
biz_up_db += " primary_contact_phone = ${bzphone}, "
biz_up_db += " primary_contact_email = ${ccemail}, "
biz_up_db += " business_primary_contact = ${bzccname} "
biz_up_db += " where business_unit_wk = ${biz_wk} "
biz_up_db += "  RETURNING business_unit_wk; "

exports.update_biz_up_db = function (upbiz_obj) {
    
    return pgdb.one(biz_up_db, upbiz_obj);
}


//display campaign stats

//edit user display 
//var displaycamp_stats = 'select * from uvw_report_all_calc where attempt_log_attempts = $1 and  business_unit_wk = $2 '

var displaycamp_stats = 'select * from uvw_report_all_calc_v2 where  business_unit_wk = $1 '


exports.campaign_perfdb = function (bix_unit, st_dt, end_dt, attin) {
    console.log(displaycamp_stats);

   // return pgdb.manyOrNone({ text: displaycamp_stats , values: [attin, bix_unit] });
    return pgdb.manyOrNone({ text: displaycamp_stats , values: [ bix_unit] });
}
//attempt perf display
var displayattempt_stats = 'select * from uvw_attempt_all where business_unit_wk = $1'

exports.attempt_perfdb = function (bix_unit, st_dt, end_dt, statusin) {
    console.log(displayattempt_stats);
    //, values: [bix_unit] 
    return pgdb.manyOrNone({ text: displayattempt_stats , values : [bix_unit]});
}





//insert user tracking
exports.insert_user_tracking = function (tracking_obj) {
    var query_insert_user_track = pgp.helpers.insert(tracking_obj, ['user_wk', 'track_wk', 'skill_wk', 'track_dt'], 'sc_users_track');
    
    console.log(query_insert_user_track);
    return pgdb.none(query_insert_user_track);
};




//edit user display 
var useredit_display_q = '';
useredit_display_q += ' select online_user_wk, first_name, last_name, email_addr, out_callerid , skills, user_type_wk, business_unit_wk, company_name, license_ct, pwd '
useredit_display_q += ' from sc_users_online where online_user_wk = $1 and business_unit_wk = $2'

exports.user_edit_display = function (online_user_wk, business_unit_wk) {
    return pgdb.one({ text: useredit_display_q, values: [online_user_wk, business_unit_wk] });
}




//edit user display business unit
var usereditbu_display_q = '';
usereditbu_display_q += " select online_user_wk, first_name || ' ' || last_name uname, email_addr, out_callerid , skills, user_type_wk, business_unit_wk, company_name, license_ct,pwd, user_name, (SELECT json_agg(skill_wk || '|' || skill_name)  from sc_skill where business_unit_wk = $1 ) as campaigns  "
usereditbu_display_q += ' from sc_users_online where business_unit_wk = $1 '

exports.user_edit_display_userdb = function (biz_unit) {
    return pgdb.any({ text: usereditbu_display_q, values: [biz_unit] });
}



//display activity by user
var useract_q = 'select * from get_user_detail($1,$2,$3)';

var useract_sum = 'select actt, endact, to_char(start_actdtt, \'mm-dd-yy hh12:mi AM\'::text) start_actdtt, to_char(end_actdtt, \'mm-dd-yy  hh12:mi AM\'::text) end_actdtt, to_char(actintervalt, \'HH24:MI\')  actintervalt, skill_name  from get_user_day_summary_calc($1,$2,$3)';

exports.user_act_db = function (online_user_wk, reptype, st_dt, end_dt) {
    
    console.log(st_dt, end_dt);
       
    return pgdb.manyOrNone({ text: (reptype == 'useractsummary' ? useract_sum : useract_q) , values: [online_user_wk, st_dt, end_dt ] });
}




//get current campaigns 

var getusercampaign_mgmt = '';
getusercampaign_mgmt += " SELECT skill_wk ,  skill_name campaign_name  from sc_skill where business_unit_wk = $1 "


exports.getuser_mgmt_db = function (biz_unit) {
    return pgdb.any({ text: getusercampaign_mgmt, values: [biz_unit] });
}



//update scirp 
var skill_upscript = " update sc_skill set "
skill_upscript += " skill_script_intro = $2 "
skill_upscript += " where skill_wk = $1 "
skill_upscript += "  RETURNING skill_wk; "

exports.update_script_campdb = function (upskill_obj) {
    
    return pgdb.any(skill_upscript, upskill_obj);
}


//edit user display 

var update_user_info_q = ' update sc_users_online Set '
update_user_info_q += ' first_name =  ${first_name} , '
update_user_info_q += ' last_name =  ${last_name} , '
update_user_info_q += ' email_addr =  ${email_addr} ,  '
update_user_info_q += ' out_callerid =  ${out_callerid} '
update_user_info_q += ' where online_user_wk = ${online_user_wk}  '
update_user_info_q += ' RETURNING online_user_wk  '





exports.user_edit_update = function (user_info_updatein) {
    return pgdb.one(update_user_info_q, user_info_updatein );
}



//edit user edit update modal  

var update_user_info_modal = ' update sc_users_online Set '
update_user_info_modal += ' first_name =  ${first_name} , '
update_user_info_modal += ' last_name =  ${last_name} , '
update_user_info_modal += ' email_addr =  ${email_addr},  '
update_user_info_modal += ' out_callerid =  ${out_callerid}, '
update_user_info_modal += ' pwd =  ${pwd}, '
update_user_info_modal += ' user_name =  ${user_name}, '
update_user_info_modal += ' company_name =  ${company_name}, '
update_user_info_modal += ' skills =  ${skills_in} '
update_user_info_modal += ' where online_user_wk = ${online_user_wk}  '
update_user_info_modal += ' RETURNING online_user_wk  '




exports.user_edit_update_modal_db = function (user_info_updatein) {
    console.log('User info in');
    console.log(user_info_updatein);

    return pgdb.one(update_user_info_modal, user_info_updatein);
}


//update on behald user display 
/*
var update_user_behalf_q = ' update sc_users_online Set '
update_user_behalf_q += ' Onbe_company_name =  ${Onbe_company_name} , '
update_user_behalf_q += ' Onbe_phone =  ${Onbe_phone} , '
update_user_behalf_q += ' Onbe_email =  ${Onbe_email} ,  '
update_user_behalf_q += ' Onbe_employ =  ${Onbe_employ} '
update_user_behalf_q += ' where online_user_wk = ${online_user_wk}  '
update_user_behalf_q += ' RETURNING online_user_wk  '
*/


var placeholdersip_con = ' {"User":"1000","Pass":"sc1000Loe!exe3!@#","Realm": "devacd.datapexs.com,Display:1000","WSServer":"wss://devacd.datapex.com:8089/ws","hackIpInContact": "true"} '
var update_user_behalf_q = ' WITH upsert AS(update sc_users_online set first_name = ${ first_name}, last_name = ${ last_name}, email_addr = ${ first_name}, hphone = ${first_name}, out_callerid = ${ first_name}, user_name = ${un}, pwd =  ${pwsd}, '
update_user_behalf_q += ' company_name = ${Onbe_company_name} where online_user_wk = ${ new_user_wk} RETURNING *) '
update_user_behalf_q += ' INSERT INTO sc_users_online(first_name, last_name, email_addr, hphone, out_callerid, user_name, pwd, '
update_user_behalf_q += ' skills, user_type_wk, business_unit_wk, end_point_wk, company_name,) '
update_user_behalf_q += ' select  ${first_name}, ${last_name}, ${Onbe_email},  ${Onbe_phone}, ${Onbe_phone}, ${un}, ${pwsd}, '
update_user_behalf_q += ' ${skill_wk}, ${user_type},${bizunit}, 2, ${Onbe_company_name} '
update_user_behalf_q += ' WHERE NOT EXISTS (SELECT * FROM upsert) returning online_user_wk '





exports.user_onbehalfinsert = function (user_onbehalfup_in) {
    var userinfobehalf_insert = {
        online_user_wk : user_onbehalfup_in[0],
        Onbe_company_name: user_onbehalfup_in[1],
        Onbe_phone: user_onbehalfup_in[4],
        Onbe_email: user_onbehalfup_in[3],
        first_name: (user_onbehalfup_in[2].split(' ')[0] || null) ,
        last_name: (user_onbehalfup_in[2].split(' ')[1] || null),
        un : user_onbehalfup_in[5],
        pwsd : user_onbehalfup_in[6],
        bizunit : user_onbehalfup_in[7],
        skill_wk : user_onbehalfup_in[8],
        new_user_wk : user_onbehalfup_in[9],
        user_type : 5
    };
    
    
    return pgdb.one( update_user_behalf_q, userinfobehalf_insert );
}

       


//agent login query 
var loginquery = '';
loginquery += ' select online_user_wk, first_name, last_name, email_addr, out_callerid , skills, user_type_wk, business_unit_wk, company_name, license_ct '
loginquery += ' , (select end_point_ext from sc_endpoints where end_point_ext = $3 LIMIT 1) end_point_ext '
loginquery += ' ,(select pwd from sc_endpoints where end_point_ext = $3 LIMIT 1) pwd '
loginquery += ' ,(select realm from sc_endpoints where end_point_ext = $3 LIMIT 1) realm '
loginquery += ' ,(select wsserver from sc_endpoints where end_point_ext = $3 LIMIT 1) wsserver '
loginquery += ' ,(select stunserver from sc_endpoints where end_point_ext = $3 LIMIT 1)  stunserver '
loginquery += ' ,(select sip_gateway from sc_endpoints where end_point_ext = $3 LIMIT 1) sip_gateway '
loginquery += ' from sc_users_online '
loginquery += ' where user_name=$1 and pwd=$2 '
loginquery += ' LIMIT 1 '


//user login query 
var loginqueryuser = '';
loginqueryuser += ' select online_user_wk, first_name, last_name, email_addr, out_callerid , skills, user_type_wk, sc_users_online.business_unit_wk, company_name,'
loginqueryuser += ' end_point_ext, sc_endpoints.pwd, realm, wsserver, stunserver, sip_gateway, license_ct '
loginqueryuser += ' from sc_users_online '
loginqueryuser += ' left join sc_endpoints on sc_users_online.end_point_wk = sc_endpoints.endpoint_wk '
loginqueryuser += ' where user_name = $1 and sc_users_online.pwd = $2 and -1 = $3'
loginqueryuser += ' LIMIT 1 '





exports.logincheck = function (username, password, stationid) {
    
    var querylogin = '';
    
    


    
    if  (stationid == -1) {

        querylogin = loginqueryuser;

        //console.log(querylogin);

    } else {

        querylogin = loginquery;

    }

    return pgdb.one({ text: querylogin, values: [username, password, stationid] });
    
}


/* old dial rec multi pull
var pulldialrec = ' update sc set acd_pull_time = now(), current_socketid = $4 '
pulldialrec += ' from sc_contacts sc '
pulldialrec += ' join sc_skill sk on $1 = sk.skill_wk '
pulldialrec += ' where sc.contact_wk in(select contact_wk from sc_contacts where sc_contacts.acd_pull_time is  null and sc_contacts.skill_wk = $1 LIMIT $5)  '
pulldialrec += ' and sc.contact_wk = sc.contact_wk '
pulldialrec += ' RETURNING sc.* , skill_name, '
pulldialrec += ' (SELECT json_agg(t) as dispo_db_display from(select dispo_wk as dispowk , dispo_description  as dispodescript, dispo_code as dispocode from sc_disposition where sc_disposition.skill_wk = sc.skill_wk)  t)  , '
pulldialrec += " (SELECT json_agg(tql) as qst_display from(select qst_order, qst_value, qst_prompt, qst_type, qst_max_value, '' ans_value, '' ans_dt from sc_srv_qst_link  scql join sc_question sq on sq.qst_id = scql.qst_id where SCQL.SRV_ID =sk.SRV_ID  )  tql), "
pulldialrec += " (SELECT json_agg(srvinfo) as srv_info_display from(select srvsc.*, contact_type_description, '-1' srv_current , '0' srv_next , '-2' srv_back, '' ans_value   from sc_survey  srvsc join sc_contact_type cty on srvsc.contact_type =  cty.contact_type where   srvsc.srv_id =  sk.srv_id LIMIT $5)  srvinfo); "
*/

//new dial record multi pull 
var pulldialrec = ' update sc_contacts as sc ' 
pulldialrec +=  ' set acd_pull_time = now(), current_socketid =  $4 '
pulldialrec += ' from  sc_skill sk  '
pulldialrec += ' where sc.contact_wk in( select contact_wk from sc_contacts '
pulldialrec += ' join sc_skill on sc_contacts.skill_wk = sc_skill.skill_wk '
pulldialrec += " where sc_contacts.skill_wk in (get_skill_dial('skillreplace')) "
pulldialrec += " and sc_responded = 0 and sc_contacts.call_att < sc_skill.skill_max_att "
pulldialrec += " and(sc_contacts.acd_pull_time is NULL or coalesce(sc_contacts.acd_pull_time, now()) +(get_skill_min_btw(sc_contacts.skill_wk,coalesce(sc_contacts.last_dispo_wk,-1))  || ' minute ')::interval < now()) "
pulldialrec += " and (sc_contacts.last_attempt_dt is null or coalesce(sc_contacts.last_attempt_dt, now()) + (get_skill_min_btw(sc_contacts.skill_wk,coalesce(sc_contacts.last_dispo_wk,-1))  || ' minute')::interval < now()) order by coalesce(call_att,0)  limit $5 ) "
pulldialrec += ' and sc.skill_wk = sk.skill_wk '
pulldialrec += ' RETURNING sc.* , skill_name, skill_tz, appt_dow, skill_script_intro, '
pulldialrec += ' (SELECT json_agg(t) as dispo_db_display from(select dispo_wk as dispowk , dispo_description  as dispodescript, dispo_code as dispocode from sc_disposition where sc_disposition.skill_wk = 13)  t)  , '
pulldialrec += " (SELECT json_agg(tql) as qst_display from(select qst_order, qst_value, qst_prompt, qst_type, qst_max_value, '' ans_value, '' ans_dt from sc_srv_qst_link  scql join sc_question sq on sq.qst_id = scql.qst_id where SCQL.SRV_ID =sk.SRV_ID  )  tql), "
pulldialrec += " (SELECT json_agg(srvinfo) as srv_info_display from(select srvsc.*, contact_type_description, '-1' srv_current , '0' srv_next , '-2' srv_back, '' ans_value   from sc_survey  srvsc join sc_contact_type cty on srvsc.contact_type =  2 where   srvsc.srv_id =  2 LIMIT $5)  srvinfo); "


exports.getdialrec = function (skillid, socketid) {
    
    console.log(skillid);
    return pgdb.one(pulldialrec.replace(/skillreplace/g, skillid), [skillid, 1, null, socketid, 1]);
}



var give_rec_sql = ' update sc_contacts set acd_pull_time = null, current_socketid = null '
give_rec_sql += ' where contact_wk = $1 '
give_rec_sql += ' RETURNING contact_wk  '


exports.givedialrecdb = function (contact_wk) {
    
    return pgdb.one(give_rec_sql, [contact_wk]);
    

}




var insertattempter = ' insert into sc_contact_Attempt (socketid,att_diallocation,att_date, online_user_wk, att_audiofile,att_phone,skill_wk, contact_wk, dispo_wk )  '
insertattempter += ' values (${socketid},${contact_type},now(),${online_user_wk},${msg},${attphone},${skill_wk},${contact_wk},${dispo_wk})  '
insertattempter += ' RETURNING *  '


exports.insertattrecerr = function (userinfo, dialinfo, contacttype, dispo) {
    
    
    //console.log('inside insert contact attempt insert');
    
    var pginsertobj = {
        
        socketid : userinfo.useridsock,
        ext : userinfo.extension,
        att_caller : userinfo.un,
        msg : dialinfo.sc_msg_path,
        attphone : userinfo.current_att_phone,
        att_date : userinfo.lastdialtime,
        contact_wk : dialinfo.contact_wk,
        skill_wk : dialinfo.skill_wk,
        online_user_wk : userinfo.online_user_wk,
        contact_type : contacttype,
        dispo_wk : dispo
    };
    
    
    //console.log('insert obj');
    //console.log(pginsertobj);
    
    return pgdb.one(insertattempter, pginsertobj);
    

}


var insertattempt = ' insert into sc_contact_Attempt (socketid,att_diallocation,att_date, online_user_wk, att_audiofile,att_phone,skill_wk, contact_wk, dispo_wk )  '
insertattempt += ' values (${socketid},${contact_type},now(),${online_user_wk},${msg},${attphone},${skill_wk},${contact_wk},0)  '
insertattempt += ' RETURNING *  '


exports.insertattrec = function (userinfo, dialinfo, contacttype) {
    
    
    //console.log('inside insert contact attempt insert');

    var pginsertobj = {
        
        socketid : userinfo.useridsock,
        ext : userinfo.extension,
        att_caller : userinfo.un,
        msg : dialinfo.sc_msg_path,
        attphone : userinfo.current_att_phone,
        att_date : userinfo.lastdialtime,
        contact_wk : dialinfo.contact_wk,
        skill_wk : dialinfo.skill_wk,
        online_user_wk : userinfo.online_user_wk,
        contact_type : contacttype
    };
    
    
    //console.log('insert obj');
    //console.log(pginsertobj);
    
    return pgdb.one(insertattempt, pginsertobj);
    

}






var insertattemptinb = ' insert into sc_contact_Attempt (att_diallocation,att_date,skill_wk, contact_wk, dispo_wk, att_dnis,channelid )  '
insertattemptinb += " values (${contact_type},now(),(select skill_wk from sc_skill where skill_dnis = right(${att_dnis},10) LIMIT 1),${contact_wk},${dispo_wk},right(${att_dnis},10),${channelid})  "
insertattemptinb += ' RETURNING * , (SELECT (SELECT json_agg(t) as dispo_db_display  from (select dispo_wk as dispowk , dispo_description  as dispodescript, dispo_code as dispocode from sc_disposition where sc_disposition.skill_wk = 13)  t) from sc_skill where sc_skill.skill_wk  = sc_contact_Attempt.skill_wk LIMIT 1) '
insertattemptinb += " , (SELECT json_agg(tql) as qst_display from(select qst_order, qst_value, qst_prompt, qst_type, qst_max_value, '' ans_value,  '' ans_dt,''  srv_current  , '' srv_next , '' srv_back  from sc_srv_qst_link  scql join sc_question sq on sq.qst_id = scql.qst_id where SCQL.SRV_ID in  (select srv_id from sc_skill where sc_skill.skill_wk  = sc_contact_Attempt.skill_wk LIMIT 1))  tql) "
insertattemptinb += ' , (SELECT json_agg(d) as dnis_info  from (select * from sc_skill where sc_skill.skill_wk  = sc_contact_Attempt.skill_wk  LIMIT 1) d) '
insertattemptinb += " , (SELECT json_agg(scs) as srv_info_display from (select scks.*,  contact_type_description, '-1' srv_current , '0' srv_next  , '-2' srv_back, '' ans_value   from sc_survey scks join sc_contact_type cty on scks.contact_type =  cty.contact_type "
insertattemptinb += ' where scks.srv_id in(select srv_id from sc_skill where sc_skill.skill_wk = sc_contact_Attempt.skill_wk LIMIT 1)LIMIT 1) scs) ,'
insertattemptinb += ' (SELECT json_agg(scs) as srv_rsp from '
insertattemptinb += ' (select sqlz.qst_id, sr.rsp_id, sr.rsp_value, sqlz.qst_order from sc_srv_qst_link sqlz '
insertattemptinb += ' join sc_question sq on sqlz.qst_id = sq.qst_id '
insertattemptinb += ' join sc_response sr on sq.rsp_id = sr.rsp_id '
insertattemptinb += '  where sqlz.srv_id in (select skw.srv_id from sc_skill skw where skw.skill_wk = sc_contact_Attempt.skill_wk LIMIT 1)) as scs) '





exports.insertattrecinb = function (dialinfo, contacttype) {
    
    
   // console.log('inside insert for DB att_dial rec inb');
    
    var pginsertobj = {
        
       
        att_dnis : dialinfo.did,
        att_date : dialinfo.inbound_dt,
        contact_wk : 0,
        skill_wk : dialinfo.skill_wk,
        contact_type : contacttype,
        dispo_wk : dialinfo.dispo_wk,
       channelid : dialinfo.chan_id


    };
    
    
   // console.log('insert obj');
    //console.log(pginsertobj);
    
    return pgdb.one(insertattemptinb, pginsertobj);
    

}



var updateattemptinb = ' update sc_contact_Attempt Set '
updateattemptinb += ' att_termcode = ${dispo_wk} , '
updateattemptinb += ' dispo_wk = ${dispo_wk} , '
updateattemptinb += ' socketid = ${socket_id} ,  '
updateattemptinb += ' skill_wk = ${skill_wk} ,'
updateattemptinb += ' channelid = ${channelid}, '
updateattemptinb += ' agent_chan_id = ${agent_chan_id}, '
updateattemptinb += ' att_phone = ${att_phone}, '
updateattemptinb += ' online_user_wk = ${online_user_wk} ,'
updateattemptinb += ' sc_att_end_date = now(), '
updateattemptinb += ' sc_att_dispo_date = now() '
updateattemptinb += ' where att_wk = ${wrap} '
updateattemptinb += ' RETURNING *  '



exports.updatedisporecinb = function (dialinfo) {
    
    
    //console.log('DB update contact' + dialinfo);
    var updateattemptatt = updateattempt;
    
    
    var pgupdateobj = {
        att_wk : dialinfo.att_wk,
        att_dnis : dialinfo.did,
        att_phone : dialinfo.ani,
        att_date : dialinfo.inbound_dt,
        contact_wk : dialinfo.contact_wk,
        skill_wk : dialinfo.skill_wk,
        dispo_wk : dialinfo.dispo_wk,
        socket_id : dialinfo.socketid,
        channelid : dialinfo.chan_id,
        online_user_wk : dialinfo.online_user_wk,
        agent_chan_id : dialinfo.currentagchan
       
    };
    
    
 //   console.log('update inb obj');
   // console.log(pgupdateobj);
    
    
    
    
    return pgdb.one(updateattemptinb, pgupdateobj);
    

}


var updateattempt = ' update sc_contact_Attempt Set '
updateattempt += ' talktime = ${talk} , '
updateattempt += ' wrapuptime = ${wrap} , '
updateattempt += ' att_termcode = ${dispo} , '
updateattempt += " channelid = case when ${channel_id} <> '*' THEN ${channel_id} else channelid END , "
updateattempt += ' dispo_wk = ${dispowk} , '
updateattempt += ' ** '
updateattempt += ' *@ '
updateattempt += ' ## '
updateattempt += ' att_diallocation = ${contacttype} ' 
updateattempt += ' where att_wk = ${att_wk} '
updateattempt += ' #666# '
updateattempt += ' RETURNING *;  '
 





exports.updatedisporec = function (att_wkin, socketidin, contacttypein, dispowkin, dispoin, talk, wrap, cbt, endstatus, channelid, dispo_email, dispo_email_comments, contact_wk  ) {
    
    
    console.log('update dispo rec' + endstatus);
    var  updateattemptatt = updateattempt;


    var pgupdateobj = {
        
        socketid : socketidin,
        att_wk : att_wkin,
        contacttype : contacttypein,
        dispo : dispoin,
        dispowk : Math.abs(dispowkin),
        talk : talk,
        wrap : wrap,
        end_status : endstatus,
        channel_id : channelid,
        cb_bt : cbt,
        comments : dispo_email_comments,
        contact_email : dispo_email,
        contact_wk : contact_wk
    };
    
    
  //  console.log('update obj');
    // console.log(pgupdateobj);
    
    
    
    
    
    
    if (dispoin == 'EMI') {
        
        
        updateattemptatt = updateattemptatt.replace('#666# ', '; update sc_contacts set comments = ${comments}, contact_email  = ${contact_email} where contact_wk = ${contact_wk} ')

    } else {
        
        updateattemptatt = updateattemptatt.replace('#666#',  ' ')

    }
    

    if (dispoin == 'CBT') {


        updateattemptatt = updateattemptatt.replace('##', ' callback_dt = ${cb_bt}, ')

    }else {

        updateattemptatt = updateattemptatt.replace('##', ' ')

    }    
    if (dispowkin == 0) {
        
     //   console.log('zero');
        
        updateattemptatt = updateattemptatt.replace('**', ' sc_att_end_date = now(), ')
    } else if (dispowkin < 0) {
        
       // console.log('less than zero');
        updateattemptatt = updateattemptatt.replace('**', ' sc_att_end_date = now(), sc_att_dispo_date = now(), ')
    } else if (dispowkin > 0) {
     //   console.log('greter than zero');
        updateattemptatt = updateattemptatt.replace('**', ' sc_att_dispo_date = now(), ')
    }
    
    
    if (endstatus != '*@') {
        

        updateattemptatt = updateattemptatt.replace('*@', " sys_end_status =  '${end_status}', ")
    } else { 
    
        updateattemptatt = updateattemptatt.replace('*@', '')
    }

    
    console.log(updateattemptatt);

    return pgdb.one(updateattemptatt, pgupdateobj);
    

}




//display campaigns 
/*
var campaign_display_sql = " select skill_wk, skill_name, status_display_value status "
campaign_display_sql += ' from sc_skill  '
campaign_display_sql += ' join sc_skill_status sq on sc_skill.skill_status = sq.status_id '
campaign_display_sql += '  where business_unit_wk = ${bisunit} and skill_type_wk = ${campaign_type} and sc_skill.skill_status <> 4'
*/



var campaign_display_sql = ' select sc_skill.skill_wk as id, sc_skill.business_unit_wk, sc_skill.skill_wk, skill_name, sq.status_display_value status , audio_info, skill_max_att, appt_st_end_time, appt_dow, msg_dow, dial_dow, '
campaign_display_sql += ' dial_min_btw, skill_tz, skill_script_intro, appt_type, appt_type_descript, skill_emails, sum_list, start_dt::date  start_dt, msg_min_btw, appt_restrict_info , appt_min_duration, skill_tz, appt_day_info '
campaign_display_sql += ' from sc_skill '
campaign_display_sql += ' left join(SELECT  skill_wk, array_agg(msg_num) as audio_info   '
campaign_display_sql += ' from(select skill_wk, msg_num from sc_skill_audio order by skill_wk, msg_num) d '
campaign_display_sql += ' group by skill_wk  ) as sk_audio on sc_skill.skill_wk  = sk_audio.skill_wk '
campaign_display_sql += ' join uvw_campaign_status sq on sc_skill.skill_wk = sq.skill_wk  '
campaign_display_sql += ' where business_unit_wk = ${bisunit} and skill_type_wk = ${campaign_type} and sq.status_id <> 4 order by sq.status_id, skill_name   '



exports.campaign_display = function (bis_unit) {
    var pgcampdispobj = { 
        bisunit : bis_unit,
        campaign_type : 1
    };
    return pgdb.manyOrNone(campaign_display_sql, pgcampdispobj);
}





//display completed campaigns 
var campaign_comp_sql = " select sc_skill.skill_wk, skill_name, sq.status_display_value status "
campaign_comp_sql += ' from sc_skill  '
campaign_comp_sql += ' join uvw_campaign_status sq on sc_skill.skill_wk = sq.skill_wk and sq.status_id = 4 '
campaign_comp_sql += '  where business_unit_wk = ${bisunit} and skill_type_wk = ${campaign_type} order by sq.status_id, skill_name  '


exports.campaign_completed_display = function (bis_unit) {
    var pgcampdispobj = {
        
        bisunit : bis_unit,
        campaign_type : 1
    };
    return pgdb.manyOrNone(campaign_comp_sql, pgcampdispobj);
}


//display responder report  



var campaign_respond_sql = " select sc.skill_wk, skill_name , skill_type_name, home_phone, to_char(last_attempt_dt, 'yyyy-mm-dd hh12: mi: ss AM')  last_attempt_dt, sc.business_name, ";
campaign_respond_sql += " (first_name || ' ' || last_name) fl_name, sc_msg_path, Log_dt,  ";
campaign_respond_sql += " (coalesce(contact_addr,'') || ' , ' || coalesce(contact_city,'') || ' , ' || coalesce(contact_state,'') || ' ' || coalesce(contact_zip,'')) contact_addr, call_status, contact_wk , ";
campaign_respond_sql += " '<div class=\"squaredTwo\" ><input type=\"checkbox\" value=\"none\" id=\"squaredTwo-' ||  sc.contact_wk::varchar(25) || '\" name=\"check\" /><label for=\"squaredTwo-' || sc.contact_wk::varchar(25) || '\"></label></div>' remove_resp"
campaign_respond_sql += ' from sc_contacts sc ';
campaign_respond_sql += ' join sc_skill sk on sc.skill_wk = sk.skill_wk ';
campaign_respond_sql += ' join sc_skill_type st on sk.skill_type_wk = st.skill_type_wk ';
campaign_respond_sql += ' where sc.skill_wk in (skillreplace) ';
campaign_respond_sql += ' and sc.business_unit_wk = ${bisunit}  and COALESCE(sc.sc_responded,0) = 0 '
//campaign_respond_sql += " and (sc.log_dt >= 'st_dt' :: date and sc.log_dt < ( 'end_dt' :: date + ' 1 day '::interval) ) ";




exports.responder_display = function (bis_unit, skillid, st_dt_rsp, end_dt_rsp ) {
    var pgrespdispobj = {
        
        bisunit : bis_unit,
        skillid : skillid,
        st_dt_rsp : st_dt_rsp,
        end_dt_rsp : end_dt_rsp
    };
    
    console.log(campaign_respond_sql.replace('skillreplace', skillid).replace('st_dt', st_dt_rsp).replace('end_dt', end_dt_rsp));

    return pgdb.manyOrNone(campaign_respond_sql.replace('skillreplace', skillid).replace('st_dt', st_dt_rsp).replace('end_dt', end_dt_rsp), pgrespdispobj);
}








//display responded report  



var responded_sql = " select sc.skill_wk, sk.skill_name , skill_type_name, home_phone,  to_char(sc_responded_dt, 'DD Mon YYYY HH12:MI:SS AM') sc_responded_dt,  sc_responded_user_wk,  (su.first_name || ' ' || su.last_name) repd_name, sc.business_name, ";
responded_sql += " (sc.first_name || ' ' || sc.last_name) fl_name, sc_msg_path, Log_dt,  ";
responded_sql += " (coalesce(contact_addr,'') || ' , ' || coalesce(contact_city,'') || ' , ' || coalesce(contact_state,'') || ' ' || coalesce(contact_zip,'')) contact_addr, call_status, contact_wk "
responded_sql += ' from sc_contacts sc ';
responded_sql += ' join sc_skill sk on sc.skill_wk = sk.skill_wk ';
responded_sql += ' join sc_skill_type st on sk.skill_type_wk = st.skill_type_wk ';
responded_sql += ' left join sc_users_online su on sc.sc_responded_user_wk = su.online_user_wk ';
responded_sql += ' where sc.skill_wk in (skillreplace) ';
responded_sql += ' and sc.business_unit_wk = ${bisunit}  and COALESCE(sc.sc_responded,-1) = 1 ';
//responded_sql += " and (sc.sc_responded_dt >= 'st_dt' :: date and sc.sc_responded_dt < ( 'end_dt' :: date + ' 1 day '::interval) ) ";



exports.responded_display = function (bis_unit, skillid, st_dt_rpd, end_dt_rpd ) {
    var pgrespdispobj = {
        
        bisunit : bis_unit,
        skillid : skillid,
        st_dt_rpd : st_dt_rpd,
        end_dt_rpd : end_dt_rpd
    };
    

    
    console.log(responded_sql.replace('skillreplace', skillid).replace('st_dt', st_dt_rpd).replace('end_dt', end_dt_rpd));
    return pgdb.manyOrNone(responded_sql.replace('skillreplace', skillid).replace('st_dt', st_dt_rpd).replace('end_dt', end_dt_rpd), pgrespdispobj);
}







//appt_dt  report  



var appt_dt_sql = " select sc.skill_wk, sk.skill_name , skill_type_name, home_phone,  to_char(appt_dt, 'yyyy-mm-dd hh12:mi:ss AM') appt_dt,  sc_responded_user_wk,  (su.first_name || ' ' || su.last_name) repd_name, sc.business_name, ";
appt_dt_sql += " (sc.first_name || ' ' || sc.last_name) fl_name, sc_msg_path, Log_dt,  ";
appt_dt_sql += " (coalesce(contact_addr,'') || ' , ' || coalesce(contact_city,'') || ' , ' || coalesce(contact_state,'') || ' ' || coalesce(contact_zip,'')) contact_addr, call_status, contact_wk "
appt_dt_sql += ' from sc_contacts sc ';
appt_dt_sql += ' join sc_skill sk on sc.skill_wk = sk.skill_wk ';
appt_dt_sql += ' join sc_skill_type st on sk.skill_type_wk = st.skill_type_wk ';
appt_dt_sql += ' left join sc_users_online su on sc.sc_responded_user_wk = su.online_user_wk ';
appt_dt_sql += ' where sc.skill_wk in (skillreplace) ';
appt_dt_sql += ' and sc.business_unit_wk = ${bisunit}  and sc.appt_dt is not null  '
//appt_dt_sql += " and (sc.appt_dt >= 'st_dt' :: date and sc.appt_dt < ( 'end_dt' :: date + ' 1 day '::interval) ) ";




exports.appt_dt_display = function (bis_unit, skillid, st_dt_appt, end_dt_appt ) {
    var pgrespdispobj = {
        
        bisunit : bis_unit,
        skillid : skillid,
        st_dt_appt: st_dt_appt,
        end_dt_appt : end_dt_appt
    };
    return pgdb.manyOrNone(appt_dt_sql.replace('skillreplace', skillid).replace('st_dt', st_dt_appt).replace('end_dt', end_dt_appt), pgrespdispobj);
}











//remove responder from cycle


var rem_respond_db_sql = ' update sc_contacts set sc_responded = 1, sc_responded_dt = now(), sc_responded_user_wk = $2 '
rem_respond_db_sql += ' where contact_wk = $1 '
rem_respond_db_sql += ' RETURNING contact_wk  '


exports.rem_respond_db = function (contact_wk, online_user_wk) {
    
    return pgdb.one(rem_respond_db_sql, [contact_wk, online_user_wk]);
    

}



//update record info 


var update_rec_info_sql = ' update sc_contacts '
update_rec_info_sql += ' set ' 
update_rec_info_sql += ' first_name =  ${first_name}, '
update_rec_info_sql += ' last_name =  ${last_name}, ' 
update_rec_info_sql += ' home_phone =  ${home_phone}, '
update_rec_info_sql += ' work_phone =  ${work_phone}, '
update_rec_info_sql += ' contact_addr =  ${contact_addr}, '
update_rec_info_sql += ' contact_city =  ${contact_city}, '
update_rec_info_sql += ' contact_state =  ${contact_state}, '
update_rec_info_sql += ' contact_zip =  ${contact_zip}, '
update_rec_info_sql += ' business_name =  ${business_name}, '
update_rec_info_sql += ' business_type =  ${business_type}, '
update_rec_info_sql += ' cust_h_ext =  ${cust_h_ext}, '
update_rec_info_sql += ' contact_email =  ${contact_email}, '
update_rec_info_sql += ' cust_title =  ${cust_title}, '
update_rec_info_sql += ' comments =  ${comments} '
update_rec_info_sql += ' where contact_wk = ${contact_wk} '
update_rec_info_sql += ' RETURNING contact_wk  '


exports.updaterecinfo_db = function (recinfo) {
    


    
    console.log('in db');
    
    console.log(recinfo);
    
    console.log('appt dt');
    console.log(recinfo.appt_dt);
    
    
    
    return pgdb.one(update_rec_info_sql, recinfo);
    

}


//update appointment 


var update_appt_rec_info_sql = ' update sc_contacts '
update_appt_rec_info_sql += ' set '
update_appt_rec_info_sql += ' appt_dt_st =  ${appt_st_dt}, '
update_appt_rec_info_sql += ' appt_dt_end =  ${appt_end_dt}, '
update_appt_rec_info_sql += ' appt_dt =  ${appt_st_dt_skill}, ',
update_appt_rec_info_sql += ' contact_tz =  ${contact_tz} '
update_appt_rec_info_sql += ' where contact_wk = ${contact_wk} '
update_appt_rec_info_sql += ' RETURNING contact_wk  '


exports.updateappt_rec = function (recinfo) {
    
    
    
    console.log(recinfo.appt_st_dt);
    console.log(recinfo.appt_end_dt);
    console.log(recinfo.appt_st_dt_skill);
    console.log(recinfo.contact_tz);
    console.log(recinfo.contact_wk);
    return pgdb.one(update_appt_rec_info_sql, recinfo);
    

}



//update attempts


var update_rec_att_sql = 'select import_stage_prod(1); select update_att(); '



exports.updaterec_att = function () {
    
    
    
    return pgdb.manyOrNone(update_rec_att_sql);
    

}



//send email queue 
var email_queue_sql = ' select email_queue_wk, email_send, email_html , email_from, email_from_name, email_att, email_subject, email_type, appt_dt_send, email_to_name, appt_dt_st, appt_dt_end, att_phone_send , contact_vcard, user_vcard from uvw_email_queue  '


exports.email_queue_send = function () {return pgdb.any(email_queue_sql);}

//send email update queue 
var email_queue_up_sql = ' update sc_email_queue '
email_queue_up_sql += '  set sent = $2, email_send_dt = now() where email_queue_wk = $1 ' 

exports.email_queue_update = function (email_queue_wk, status) {return pgdb.any(email_queue_up_sql, [email_queue_wk, status]);}

//displays record data
var rec_info_sql = " select sc.skill_wk, sk.skill_name , skill_type_name, home_phone, to_char(appt_dt, 'mm-dd-yyyy hh12:mi AM') appt_dt, "
rec_info_sql += " (su.first_name || ' ' || su.last_name) repd_name,   "
rec_info_sql += " to_char(sc_responded_dt, 'mm-dd-yyyy hh12:mi AM') sc_responded_dt, "
rec_info_sql += " (sc.first_name || ' ' || sc.last_name) contact_name, sc_msg_path, Log_dt,   "
rec_info_sql += " (coalesce(contact_addr,'') || ' , ' || coalesce(contact_city,'') || ' , ' || coalesce(contact_state,'') || ' ' || coalesce(contact_zip,'')) contact_addr, call_status, contact_wk , dispo_description, comments, call_att, msg_att, last_email_dt, to_char(last_msg_dt, 'mm-dd-yyyy hh12:mi AM') last_msg_dt, contact_email , cust_title, cust_h_ext ,"
rec_info_sql += " (SELECT json_agg(d) as call_att_info from(select attempt_log_attempts,  to_char(att_date, 'mm-dd-yyyy hh12:mi AM') att_date, att_phone , coalesce(sd.dispo_description,'Smart Contact Message') dispo_description, talktime,  wrapuptime from sc_contact_attempt left join sc_disposition sd on  sc_contact_attempt.att_termcode = coalesce(sd.dispo_code,'SCM')  where sc_contact_attempt.contact_wk = sc.contact_wk order by attempt_log_attempts) d)  "
rec_info_sql += " from  sc_contacts sc "
rec_info_sql += " join sc_skill sk on sc.skill_wk = sk.skill_wk "
rec_info_sql += " join sc_skill_type st on sk.skill_type_wk = st.skill_type_wk "
rec_info_sql += " left join sc_users_online su on sc.sc_responded_user_wk = su.online_user_wk "
rec_info_sql += " left join sc_disposition sd on 13 = sd.skill_wk "
rec_info_sql += " and sc.last_dispo_wk = sd.dispo_wk "
rec_info_sql += " where contact_wk = $1 " 

exports.recinfo_contact_db = function (contact_wk) {
    
    console.log(rec_info_sql)
    return pgdb.any(rec_info_sql, [contact_wk]);
}


//insert into audio table 
// performance-optimized, reusable set of columns:
var cs = new pgp.helpers.ColumnSet(['audio_name', 'msg_num', 'skill_wk'], { table: 'sc_skill_audio' });


exports.updatedb_audio = function (audio_obj) {
 
    
    return pgdb.none('truncate table sc_skill_audio; ' + pgp.helpers.insert(audio_obj, cs));

}



//display appointment data by skill day 

var display_appt_day_sql = " select get_appt_day($1, $2) events "

exports.app_day_display = function (skill_wk, appt_day_in) {
    console.log(skill_wk);
    console.log(appt_day_in);

    return pgdb.any(display_appt_day_sql, [skill_wk, appt_day_in]);

}




//display appointment data by avail data of week 

var dow_up_sql = " select appt_dow from sc_skill where skill_wk = $1 "

exports.app_monthview_display = function (skill_wk) {
    
    return pgdb.any(dow_up_sql, [skill_wk, appt_day_in]);

}

//campaign SQL insert 

var skillinsert_sql = " INSERT INTO sc_skill(skill_type_wk, skill_name, skill_description, business_unit_wk, srv_id, skill_group ) ";
skillinsert_sql += " select ${skill_type_wk},${skill_name},${skill_description},${business_unit_wk},2,1 ";
skillinsert_sql += " from (select 1) as tbl  "
skillinsert_sql += " where not exists(select 1 from sc_skill where upper(skill_name) || business_unit_wk = upper(${skill_name}) || ${business_unit_wk}) Limit 1 "
skillinsert_sql += " RETURNING skill_wk; "

exports.campaign_insert = function (business_unit_wk, skill_type_wk, skill_description, skill_name) {
    var skillinsert_obj = {
        business_unit_wk : business_unit_wk,
        skill_type_wk : skill_type_wk,
        skill_description: skill_description,
        skill_name : skill_name
    };
    return pgdb.any(skillinsert_sql, skillinsert_obj);
}


//campaign SQL update  
var skillupdate_sql = " update sc_skill set skill_name = ${campaign_name}, skill_description = ${campaign_name}, skill_type_wk = ${license_type} "
skillupdate_sql += "  where skill_wk = ${skill_wk} and upper(skill_name) <> upper(${campaign_name}) and not exists(select 1 from sc_skill sk where upper(sk.skill_name) || sk.business_unit_wk = upper(${campaign_name}) || ${business_unit_wk} and sk.skill_wk <> ${skill_wk} ) Limit 1 "
skillupdate_sql += "  RETURNING skill_wk; "


exports.campaignupdate_sql = function (upskill_obj) {

    return pgdb.any(skillupdate_sql, upskill_obj);
}

var skillupdateall_sql = " update sc_skill set " 
skillupdateall_sql += " skill_name = ${campaign_name}, "
skillupdateall_sql += " skill_description = ${campaign_name}, "
skillupdateall_sql += " skill_type_wk = ${license_type}, "
skillupdateall_sql += " skill_max_att = ${msg_camp_count}, "
skillupdateall_sql += " dial_dow = ${msg_del_sch_dow_submit}, "
skillupdateall_sql += " msg_dow = ${msg_del_sch_dow_submit}, "
skillupdateall_sql += " dial_min_btw = ${min_days_dial}, "
skillupdateall_sql += " skill_tz = ${appt_TZ}, "
skillupdateall_sql += " appt_min_duration = ${appt_duration}, "
skillupdateall_sql += " skill_script_intro = ${skill_script_intro}, "
skillupdateall_sql += " max_appt = ${appt_max_appt}, "
skillupdateall_sql += " appt_dow = ${appt_dow_submit}, "
skillupdateall_sql += " appt_st_end_time = ${appt_start_end}, "
skillupdateall_sql += " msg_min_btw = ${email_delay}, "
skillupdateall_sql += " appt_type = ${appt_call_setup}, "
skillupdateall_sql += " start_dt = ${campaign_start_dt} "
skillupdateall_sql += " where skill_wk = ${skill_wk} "
skillupdateall_sql += "  RETURNING skill_wk; "

exports.campaignupdate_all_sql = function (upskill_obj) {

    return pgdb.any(skillupdateall_sql, upskill_obj);
}



var skillupdateall_bizrules = " update sc_skill set "
skillupdateall_bizrules += " dial_dow = ${dial_dow}, "
skillupdateall_bizrules += " msg_dow = ${msg_dow}, "
skillupdateall_bizrules += " dial_min_btw = ${dial_min_btw}, "
skillupdateall_bizrules += " msg_min_btw = ${msg_min_btw}, "
skillupdateall_bizrules += " start_dt = ${start_dt} "
skillupdateall_bizrules += " where skill_wk = ${skill_wk} "
skillupdateall_bizrules += " RETURNING skill_wk; "

exports.edit_biz = function (upskill_obj) {
    
    return pgdb.one(skillupdateall_bizrules, upskill_obj);
}








exports.insert_emails_db = function (data_email_in) {
    var query_insert = pgp.helpers.insert(data_email_in, ['email_msg', 'skill_attempt_msg', 'skill_wk'], 'sc_skill_msg');
    return pgdb.task(function (t) {
        return t.none("delete from sc_skill_msg where skill_wk = $1 and COALESCE(skill_attempt_msg,0) between 1 and 10", data_email_in[0].skill_wk).then(function (user) {
            return pgdb.none(query_insert);
        });
    });
}


exports.insert_appt_dates = function (data_date_in) {
    var query_insert = pgp.helpers.insert(data_date_in, ['appt_date', 'appt_dt_type', 'skill_wk'], 'sc_appt_date');
    return pgdb.task(function(t){ 
        return t.none("delete from sc_appt_date where skill_wk = $1", data_date_in[0].skill_wk).then(function(user){
            return pgdb.none(query_insert);
        });
    });
}

exports.insert_appt_dates_spect_dow_db = function (data_date_in) {
    
    var query_insert = pgp.helpers.insert(data_date_in, ['appt_date', 'appt_dt_type', 'skill_wk', 'app_dt_st_end', 'appt_duration'], 'sc_appt_date');
    var updatezone_query = 'update sc_skill set  skill_tz = $2 where skill_wk = $1'
    return pgdb.task(function (a) {
        return a.none("delete from sc_appt_date where skill_wk = $1 and appt_dt_type = 1", data_date_in[0].skill_wk).then(function (b) {
            return pgdb.any(updatezone_query, [data_date_in[0].skill_wk, data_date_in[0].skill_tz] ).then(function (c) {
                return pgdb.any(query_insert);
            });       
        });
    });
}





exports.insert_appt_dow_editmodaldb = function (data_date_in, skill_duration_tz) {
    

    var updatezone_query = 'update sc_skill set  skill_tz = $2 , appt_min_duration  = $3,  appt_dow = $4, appt_st_end_time = $5  where skill_wk = $1 RETURNING skill_wk'
  
    if ((data_date_in || []).length != 0) {
        var query_insert = pgp.helpers.insert(data_date_in, ['appt_date', 'appt_dt_type', 'skill_wk'], 'sc_appt_date');        
        return pgdb.task(function (a) {
            return a.none("delete from sc_appt_date where skill_wk = $1 and appt_dt_type = 2 ", skill_duration_tz[0]).then(function (b) {
                return pgdb.any(updatezone_query, skill_duration_tz).then(function (c) {
                    return pgdb.any(query_insert);
                });
            });
        });

    } else {
        
        

        return pgdb.task(function (a) {
            return a.none("delete from sc_appt_date where skill_wk = $1 and appt_dt_type = 2 ", skill_duration_tz[0]).then(function (b) {
                return pgdb.any(updatezone_query, skill_duration_tz);
            });
        });

        return pgdb.one(updatezone_query, skill_duration_tz);
    }
        
       
}




var state_obj = 
{
 "AL": "Alabama",
    "AK": "Alaska",
    "AS": "American Samoa",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "DC": "District Of Columbia",
    "FM": "Federated States Of Micronesia",
    "FL": "Florida",
    "GA": "Georgia",
    "GU": "Guam",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MH": "Marshall Islands",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "MP": "Northern Mariana Islands",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PW": "Palau",
    "PA": "Pennsylvania",
    "PR": "Puerto Rico",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VI": "Virgin Islands",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming"}


//import stage user 
//import procedures and vaildations 
var zonelookup = function (zonename) {
    var tzout = 0;
    switch (zonename) {
        case 'America/New_York':
            tzout = -5;
            break;
        case 'America/Chicago':
            tzout = -5;
            break;
        case 'America/Denver':
            tzout = -7;
            break;
        case 'America/Los_Angeles':
            tzout = -8;
            break;
        case 'America/Kentucky/Louisville':
            tzout = -5;
            break;
        case 'America/Indiana/Indianapolis':
            tzout = -5;
            break;
        case 'America/Detroit':
            tzout = -5;
            break;
        case 'America/Boise':
            tzout = -7;
            break;
        case 'America/Phoenix':
            tzout = -7;
            break;
        case 'America/Anchorage':
            tzout = -9;
            break;
        case 'Pacific/Honolulu':
            tzout = -10;
            break;
        case 'America/Indiana/Knox':
            tzout = -6;
            break;
        case 'America/Indiana/Winamac':
            tzout = -5;
            break;
        case 'America/Indiana/Vevay':
            tzout = -5;
            break;
        case 'America/Indiana/Marengo':
            tzout = -5;
            break;
        case 'America/Indiana/Vincennes':
            tzout = -5;
            break;
        case 'America/Indiana/Tell_City':
            tzout = -6;
            break;
        case 'America/Indiana/Petersburg':
            tzout = -6;
            break;
        case 'America/Menominee':
            tzout = -6;
            break;
        case 'America/Shiprock':
            tzout = -7;
            break;
        case 'America/Nome':
            tzout = -9;
            break;
        case 'America/Juneau':
            tzout = -9;
            break;
        case 'America/Kentucky/Monticello':
            tzout = -5;
            break;
        case 'America/North_Dakota/Center':
            tzout = -6;
            break;
        case 'America/Yakutat':
            tzout = -9;
            break;
        default:
            tzout = 0;
    }
    return tzout;
}


function zipclean(zipin){
    var zipout = '0';

    if (zipin) {
        if (zipin.length == 4) {
 
            zipout = '0' + zipin;
        } else  if (zipin.length == 5) {
            zipout = zipin;
        } else {
            zipout = '0';
        }
    } else {

        zipout = '0';
    }
    
    
    if (!(/(^\d{5}$)|(^\d{5}-\d{4}$)/.test(zipout)))
        {
        zipout =  '0';
    
    }
    
    
    return zipout;
    
}

function  cleanrec (rec) {
    return rec.replace(/&amp;/g, ' and ').replace(/[^A-Za-z0-9]/g, ' ');
}

function  cleanrecnospace(rec) {
    return rec.replace(/&amp;/g, ' ').replace(/[^A-Za-z0-9]/g, '');
}

function recreject(jsonprop, cleantype, cleanrec_type) {
    //console.log(jsonprop + '|' + cleantype + '|' + cleanrec_type);
    //-1 not rejected 
    //0 no columns 
    //1 blank value
    //2 invalid phone
    //3 invalid email
    //4 invalid zip code
    //5 no first name 
    //6 no last name 
    //7 in valild state 
    var rec_reject_type = 0;
    //cleanrec_type
    //1 phone
    //2 email 
    var output_str = '';

    if (typeof jsonprop != "undefined") {
        if (cleanrec(jsonprop).length == 0) {
            rejecttype = 1;
            output_str = null;
        } 
        else if (cleantype == 1) {
            rejecttype = -1;
            output_str = cleanrec(jsonprop);
        } 
        else if (cleantype == 2) {
            if (cleanrec_type == 1 && validator.isMobilePhone(cleanrecnospace(jsonprop), 'en-US')) {
                rejecttype = -1;
                output_str = cleanrecnospace(jsonprop);            
            } else if (cleanrec_type == 1 && !(validator.isMobilePhone(cleanrecnospace(jsonprop), 'en-US')))
            {
                rejecttype = 2;
                output_str = null;   
            } else if (cleanrec_type == 2 && validator.isEmail(validator.trim(jsonprop))) {

                rejecttype = -1;
                output_str = validator.trim(jsonprop);
            } else if (cleanrec_type  == 2 && !(validator.isEmail(validator.trim(jsonprop)))) {
                
                rejecttype = 3;
                output_str = null;
            
            } else {
                rejecttype = -1;
                output_str = cleanrecnospace(jsonprop);  
            }
        }
    } else {
        rejecttype = 0;
        output_str = null;
    }

    var outarray = [output_str, rejecttype];
    return outarray;
}

function recreject_ret_array(arrayin) {
    var arrout = [];
    var vaildyn = 0;
    if (arrayin[0] != -1 && arrayin[1] != -1 && arrayin[2] != -1) {
        arrout.push('No valid phone #');
        vaildyn = 1;
    }
    if (arrayin[3] != -1) {
        arrout.push('Invaild zip');
        vaildyn = 1;
    }
    if (arrayin[5] != -1) {
        arrout.push('Invalid last name');
        vaildyn = 1;
    }
    
    

    if (vaildyn == 0) { arrout.unshift('<i class="fa fa-check text-success" aria-hidden="true"></i> | Vaild'); }
    else { arrout.unshift('<i class="fa fa-times  text-danger" aria-hidden="true"></i>'); }
    return arrout.toString().replace(/,/g , ' | ');
}


function recreject_ret_array_num(arrayin) {
    var arrout = [];
    var vaildyn = 0;
    if (arrayin[0] != -1) {
        arrout.push('No valid phone #');
        vaildyn = 1;
    }
    if (arrayin[3] != -1) {
        arrout.push('Invaild zip');
        vaildyn = 1;
    }
    if (arrayin[5] != -1) {
        arrout.push('Invalid last name');
        vaildyn = 1;
    }
    
    /*
    if (arrayin[6] != -1) {
        arrout.push('Invalid State');
        vaildyn = 1;
    }*/

  
    return vaildyn;
}

insert_stage_db = function (stage_data_obj) {
    var query_insert = pgp.helpers.insert(stage_data_obj, ['first_name', 'last_name', 'cust_title', 'business_name', 'home_phone',  
        'cust_h_ext',  'contact_addr', 'contact_city', 'contact_state', 'contact_zip', 'contact_tz', 'contact_email', 'business_type', 'sales_contact', 
        'var_info_1', 'var_info_2', 'var_info_3', 'var_info_4', 'var_info_5', 'var_info_6', 'var_info_7', 'var_info_8', 'var_info_9', 'var_info_10', 'contact_type','import_user_wk','skill_wk','business_unit_wk','type_reject_stg'], 'sc_contacts_stage');
    
    return pgdb.none(query_insert);
};

exports.uploadcsvxls = function (socket) {
    var uploader = new SocketIOFileUpload();
    uploader.dir = "sc/public/listuploads";
    uploader.listen(socket);
    
    
    socket.on('import_listprod', function (databackclient, fn) {
        
       
        insert_stage_db(databackclient).then(function (data) {
            console.log('data insert');
            fn(databackclient)
        }).catch(function (err) { fn(-1); });
        
      

    
    });


    uploader.on("start", function (event) {
        console.log('start');
        if (!(/\.csv$/.test(event.file.name))) {
            uploader.abort(event.file.id, socket);
        }
    });
    
    
    

    uploader.on("saved", function (event) {
        console.log('Saved');
        
        

        //evalute csv file non-blocking
        var dataeval = [];
        csv().fromFile(event.file.pathName).on('json', function (jsonObj) {
            
            console.log(jsonObj);
            dataeval.push({
                first_name : recreject(jsonObj.first_name || '' || ''.substring(0, 50), 1)[0],
                last_name : recreject(jsonObj.last_name || ''.substring(0, 50), 1)[0],
                cust_title : recreject(jsonObj.cust_title || ''.substring(0, 50), 1)[0],
                business_name : recreject(jsonObj.business_name || ''.substring(0, 150), 1)[0],
                home_phone : recreject(jsonObj.cust_phone || ''.substring(0, 10), 2, 1)[0],  
                cust_h_ext : recreject(jsonObj.cust_ext || ''.substring(0, 5), 2)[0],
                sales_contact : recreject(jsonObj.sales_contact || ''.substring(0, 50), 1)[0], 
                contact_addr : recreject(jsonObj.contact_addr || ''.substring(0, 50), 1)[0], 
                contact_city : recreject(jsonObj.contact_city || ''.substring(0, 25), 1)[0], 
                contact_state : recreject(jsonObj.contact_state || ''.substring(0, 3), 2)[0],
                contact_zip : zipclean(recreject(jsonObj.contact_zip || ''.substring(0, 9), 2)[0]) == '0' ? null : zipclean(recreject(jsonObj.contact_zip || ''.substring(0, 9), 2)[0]),
                contact_email : recreject(jsonObj.contact_email || ''.substring(0, 250), 2, 2)[0],
                business_type : recreject(jsonObj.business_type || ''.substring(0, 50), 1)[0], 
                sales_contact : recreject(jsonObj.sales_contact || ''.substring(0, 50), 1)[0], 
                var_info_1 : recreject(jsonObj.var_info_1 || ''.substring(0, 250), 1)[0], 
                var_info_2 : recreject(jsonObj.var_info_2 || ''.substring(0, 250), 1)[0], 
                var_info_3 : recreject(jsonObj.var_info_3 || ''.substring(0, 250), 1)[0], 
                var_info_4 : recreject(jsonObj.var_info_4 || ''.substring(0, 250), 1)[0], 
                var_info_5 : recreject(jsonObj.var_info_5 || ''.substring(0, 250), 1)[0], 
                var_info_6 : recreject(jsonObj.var_info_6 || ''.substring(0, 250), 1)[0], 
                var_info_7 : recreject(jsonObj.var_info_7 || ''.substring(0, 250), 1)[0],
                var_info_8 : recreject(jsonObj.var_info_8 || ''.substring(0, 250), 1)[0],
                var_info_9 : recreject(jsonObj.var_info_9 || ''.substring(0, 250), 1)[0],
                var_info_10 : recreject(jsonObj.var_info_10 || ''.substring(0, 250), 1)[0],
                business_unit_wk : event.file.meta.business_unit,
                skill_wk : event.file.meta.skill_wk,
                type_reject : recreject_ret_array( [recreject(jsonObj.cust_phone || ''.substring(0, 10), 2, 1)[1] || 2, 
                     2, 
                    2,
                    zipclean(recreject(jsonObj.contact_zip || ''.substring(0, 9), 2)[0]) == '0' ? 4 : -1,
                    recreject(jsonObj.first_name || ''.substring(0, 50), 1)[0] || '' ? -1 : 5,
                    (recreject(jsonObj.last_name || ''.substring(0, 50), 1)[0] || '') == '' ? 6 : -1

                ]),
                type_reject_stg : recreject_ret_array_num([recreject(jsonObj.cust_phone || ''.substring(0, 10), 2, 1)[1] || 2, 
                    2, 
                    2,
                    zipclean(recreject(jsonObj.contact_zip || ''.substring(0, 9), 2)[0]) == '0' ? 4 : -1,
                    recreject(jsonObj.first_name || ''.substring(0, 50), 1)[0] || '' ? -1 : 5,
                    (recreject(jsonObj.last_name || ''.substring(0, 50), 1)[0] || '') == '' ? 6 : -1
                ]),
                contact_type : 2,
                import_user_wk : event.file.meta.user_wk,
                contact_tz : zonelookup(zipcode_to_timezone.lookup(zipclean(recreject(jsonObj.contact_zip || ''.substring(0, 9), 2)[0])))
            
            ///zonelookup(zipcode_to_timezone.lookup((/(^\d{5}$)|(^\d{5}-\d{4}$)/.test((((recreject(jsonObj.contact_zip.substring(0, 9), 2)[0].length || 0) == 4) ? '0' + recreject(jsonObj.contact_zip.substring(0, 9), 2)[0] : recreject(jsonObj.contact_zip.substring(0, 9), 2)[0])) || '') != '' ? ((recreject(jsonObj.contact_zip.substring(0, 9), 2)[0].length || 0) == 4) ? '0' + recreject(jsonObj.contact_zip.substring(0, 9), 2)[0] : recreject(jsonObj.contact_zip.substring(0, 9), 2)[0] : 0))
            });
                //0 no columns 
                //1 blank value
                //2 invalid phone
                //3 invalid email
                //4 invalid zip code
                //5 no first name 
                //6 no last name
        }).on('end', function (jsonArrObj) {
            //insert into database 
           //insert_stage_db(dataeval).then(function (data) { console.log(data); console.log('data insert') }).catch(function (err) { });
            //appsmain.listback(socket.id,dataeval);
            var output_arr = [];
            var rejectcount = dataeval.filter(function (row_item) { return (row_item.type_reject.indexOf('danger') > 0); }).length;
            console.log('end');
            if (typeof dataeval !== 'undefined' && dataeval.length > 0) {
                output_arr.push(dataeval.length, rejectcount, dataeval.length - rejectcount);
            }
            socket.emit('loadlisttblStage', dataeval, output_arr);
            console.log(dataeval);
        });
    });
    uploader.on("error", function (event) {
        var output_arr = [0, 0, 0];
        var dataeval = [];
        socket.emit('loadlisttblStage', dataeval, output_arr);
        console.log("Error from uploader", event);
    });
};

exports.insert_single_record = function (obj_in) {
                    var single_obj = {first_name : recreject(obj_in.first_name || '' || ''.substring(0, 50), 1)[0].split('|')[0] + '|' + recreject (obj_in.first_name || '' || ''.substring(0, 50), 1)[1],
                    last_name : recreject(obj_in.last_name || ''.substring(0, 50), 1)[0].split('|')[1] + '|' + recreject(obj_in.last_name || ''.substring(0, 50),1)[1] ,
                    cust_title : recreject(obj_in.cust_title || ''.substring(0, 50), 1)[0] + '|' + recreject(obj_in.cust_title || ''.substring(0, 50),1)[1],
                    business_name : recreject(obj_in.business_name || ''.substring(0, 150), 1)[0] + '|' + recreject(obj_in.business_name || ''.substring(0, 150),1)[1],
                    home_phone : recreject(obj_in.home_phone || ''.substring(0, 10), 2, 1)[0] + '|' + recreject(obj_in.home_phone || ''.substring(0, 10), 2, 1)[1],
                    contact_addr : recreject(obj_in.contact_addr || ''.substring(0, 50), 1)[0] + '|' + recreject(obj_in.contact_addr || ''.substring(0, 50), 1)[1], 
                    contact_city : recreject(obj_in.contact_city || ''.substring(0, 25), 1)[0] + '|' + recreject(obj_in.contact_city || ''.substring(0, 25), 1)[1], 
                    contact_state : recreject(obj_in.contact_state || ''.substring(0, 3), 2)[0] + '|' + recreject(obj_in.contact_state || ''.substring(0, 3), 2)[1],
                    contact_zip : (zipclean(recreject(obj_in.contact_zip || ''.substring(0, 9), 2)[0]) == '0' ? null : zipclean(recreject(obj_in.contact_zip || ''.substring(0, 9), 2)[0])) + '|' + (zipclean(recreject(obj_in.contact_zip || ''.substring(0, 9), 2)[0]) == '0' ? 4 : -1),
                    contact_email : recreject(obj_in.contact_email || ''.substring(0, 250), 2, 1)[0] +  '|'  + (validator.isEmail(obj_in.contact_email.trim()) ? -1 : 3),

            }

    console.log(single_obj);

    return single_obj;


}


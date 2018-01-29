
//1; "Radio Buttons"
//2; "Drop Down"
//3; "Short Answer"
//4; "Check box Multi"
//5; "Yes No"
//6; "Statement"
//7; "Numeric"
//8; "Appointment"
//9; "Appointment Branch"
//10; "Form Entry"
//11; "Form Entry Drop Down Branch"
//12; "Check box Single"


//clears record display
function clearrec() {
    $('.classinoutindicator').removeClass('green-font').removeClass('red-font').removeClass("fa-arrow-up").removeClass("fa-arrow-down").addClass("green-font").addClass('fa-phone-square');
    $('.survey_question_div').html('');
    $('.srv_name_class').html('Survey');
    $('.skilldispname').html('');
    $('.td_rec_ani').html('<a href="#" id="rec_name" class="editz">' + '</a>');
    $('.td_rec_did').html('<a href="#" id="rec_name" class="editz">' + '</a>');
    $('.srvqst_ans_div').html('');
    $('.td_rec_name').html('<a href="#" id="rec_name" class="editz">' + '</a>');
    $('.td_rec_addr').html('<a href="#" id="rec_addr" class="editz">' + '</a>');
    $('.td_rec_city').html('<a href="#" id="rec_addr" class="editz">' + '</a>');
    $('.td_rec_state').html('<a href="#" id="rec_addr" class="editz">' + '</a>');
    $('.td_rec_zip').html('<a href="#" id="rec_addr" class="editz">' + '</a>');
    $('.td_rec_company').html('<a href="#" id="rec_company" class="editz">' + '</a>');
    $('.td_rec_wp').html('<a href="#" id="rec_wp" class="editz">' + '</a>');
    $('.td_rec_hp').html('<a href="#" id="rec_hp" class="editz">' + '</a>');
    $('.td_rec_cp').html('<a href="#" id="rec_cp" class="editz">' + '</a>');
    $('.td_rec_biz').html('<a href="#" id="rec_biz" class="editz"">' + '</a>');
    $('.td_rec_ext').html('<a href="#" id="rec_ext" class="editz">' + '</a>');
    $('.td_rec_msgnum').html('');
    $('.td_rec_attnum').html('');
    $('.td_rec_title').html('<a href="#" id="rec_title" class="editz"">' + '</a>');
    
    $('.td_rec_email').html('<a href="#" id="rec_email" class="editz"">' + '</a>');
    
 

    $('.dialinp').val('');
    $('.com_textarea').val('');
    $('.appt_dt_input').val('');

    $('.td_appt_dt').html('');

    $('.srv_qst_display_order').val('');
    $(".set_appt_btn").hide();
    
    $('.weather_name').html('');
    $('.weather_tag').html('');
    $('.weather_temp').html('');
    $('.weather_descript').html('');
    $('.weather_temp').html('');
    $('.weather_icon').html('');



    
    $('#srv_take').html('');
    $('#srv_refused').html('');
    $('#srv_leftmessage').html('');
    $('#srv_dnc').html('');
    $('#srv_intro_div').html('');
    
    /*$('.navsrv_ul').hide();
    
    $('.in_srv_fwdback_btn').hide(0, function () {
        $('#srv_take').removeClass('active');
        $('.intro_srv_btns').hide();
        $('.survey_question_div').html('');

    });

    */


}



//replace survey content vars 
function replace_srv_vars(in_content, userinfo) {
    
    
    in_content = in_content.replace(/\[agent\]/g, userinfo.name).replace(/\[name\]/g, currentrecord.first_name + ' ' + currentrecord.last_name).replace(/\[company\]/g, currentrecord.business_name)
    .replace(/\[contact_first_name\]/g, currentrecord.first_name)
    .replace(/\[contact_last_name\]/g, currentrecord.last_name)
    .replace(/\[contact_name\]/g, currentrecord.first_name + ' ' + currentrecord.last_name)
    .replace(/\[contact_business_name\]/g, currentrecord.business_name)
    .replace(/\[contact_phone\]/g, currentrecord.home_phone)
    .replace(/\[contact_title\]/g, currentrecord.cust_title)
    .replace(/\[user_name\]/g, userinfo.name)
    .replace(/\[contact_variable_1\]/g, currentrecord.var_info_1)
    .replace(/\[contact_variable_2\]/g, currentrecord.var_info_2)
    .replace(/\[contact_variable_3\]/g, currentrecord.var_info_3)
    .replace(/\[contact_variable_4\]/g, currentrecord.var_info_4)
    .replace(/\[contact_variable_5\]/g, currentrecord.var_info_5)
    .replace(/\[contact_variable_6\]/g, currentrecord.var_info_6);


    
    return in_content;

}




function srv_qst_ans_get(qst_type, ans_obj_in, qst_order, qst_num_max_value) {
    
    var ans_value_html = '';
    var ans_value_html_front = '';
    var ans_value_html_back = '';
    
    console.log(ans_obj_in);
    

    
  if (qst_type == 1) {
        
        
        
        for (var key in ans_obj_in) {
            
            
            
            ans_value_html += '<input type="radio" name="srv_radio" class="srv_radio" value ="' + ans_obj_in[key].rsp_value + '">';
            
            //1; "Radio Buttons"
            console.log(ans_obj_in[key].rsp_value);
            
            if (key == ans_obj_in.length - 1) {
                
                
                
                console.log(ans_obj_in[key].rsp_value);
                $('.srvqst_ans_div').html(ans_value_html);
            }


        }


      

    } else if (qst_type == 2) {
        
        
        
        
        for (var key in ans_obj_in) {
            
            
            
            ans_value_html += '<option>' + ans_obj_in[key].rsp_value + '</option>';
            
            //2; "Drop Down"
            console.log(ans_obj_in[key].rsp_value);
            
            if (key == ans_obj_in.length - 1) {
                
                
                
                console.log(ans_obj_in[key].rsp_value);
                $('.srvqst_ans_div').html('<select class="srv_dropdown">' + ans_value_html + '</select>').promise().done(function () {
            
            
                $('.srv_dropdown').selectpicker({
                    size: 5
                });

                });
            }


        }
    
    } else if (qst_type == 3) {
        
        
        
        ans_value_html += '<input type="text" name="srv_shortanswer" class="srv_shortanswer"> '
        


    }
    
    
    else if (qst_type == 5) {

        
        
        $('.srvqst_ans_div').html('<table class="srvyesnotable" style="text-align: initial;padding-left:50px"><tr><td><label class="fancy-radio"><input type="radio" name="srv_yesno"  class="srv_yesno" value="YES"><span style="font-size:16px"><i></i>YES</span></label></td></tr><tr><td><label class="fancy-radio"><input type="radio" name="srv_yesno"  class="srv_yesno" value="NO"><span style="font-size:16px"><i></i>NO</span></label></td></tr></table>');

        




    }

    else if (qst_type == 7) {
        
        
        
        $('.srvqst_ans_div').html('<input id="srv_num" name ="srv_num" type="text" class="form-control">').promise().done(function () {
        

            
            
            $("input[name='srv_num']").TouchSpin({
                min: 0,
                max: qst_num_max_value,
                step: 1,
                decimals: 0,
                boostat: 5,
                maxboostedstep: 2,
                postfix: '#'
            });



        });;
        


    } else if (qst_type == 6) {
        
        
        
        $('.srvqst_ans_div').html('');
        


    }


    		
}



$(document).ready(function () {
    
    
    
    
    //click events
    
    //remove active 
    $('srv_take').removeClass('active');
    
    
    //survey click functions
    $('#main-content-wrapper > div > div.main-content.mmnu_agentcontent > div.row > div.col-md-8 > div.widget > div.widget-footer > table > tbody > tr > td > ul li').click(function (e) {
        
        var checksrvmnu = $.trim($(this).find('button').text());
        var orderdisp = 0;
        
        
        console.log(current_user_srv.srv_user.srv_current);
        // console.log(current_user_srv.srv_qst);
        
        $(this).find('a').addClass('bottom-srv-ts');
        
        $('.navsrv_ul li a').removeClass(function (index, css) {
            return (css.match(/(^|\s)bottom-srv-\S+/g) || []).join(' ');
        });
        
        
        console.log(checksrvmnu);
        
        
        console.log('Current ' + current_user_srv.srv_user.srv_current);
        console.log('Current array ' + current_user_srv.srv_qst.length);
        
        
        
        
        
        
        if (checksrvmnu == 'Take Survey') {
            console.log(' intake survey');
            $('.navsrv_ul li a').removeClass(function (index, css) {
                return (css.match(/(^|\s)active\S+/g) || []).join(' ');
            });
            
            
            $('.intro_srv_btns').hide(0, function () {
                
                $('.srvqst_ans_div').hide();
                
                $('#srv_intro_div').hide(0, function () {
                    
                    $('.in_srv_fwdback_btn').show();
                });
            });
            
            $(this).find('a').addClass('bottom-srv-ts');
            
            $('.srv_qst_display_order').html('Take Survey Intro');
            
            current_user_srv.srv_user.srv_current = 0;
            current_user_srv.srv_user.srv_next = 1;
            current_user_srv.srv_user.srv_back = -1;
            
            console.log(current_user_srv.srv_user);


        } else if (checksrvmnu == 'Refuse Survey') {
            $(this).find('a').addClass('bottom-srv-rs');
            $('#srv_intro_div').hide();
            $('.srv_qst_display_order').html('Refuse Survey');

        } else if (checksrvmnu == 'Left Message') {
            $(this).find('a').addClass('bottom-srv-lm');
            $('#srv_intro_div').hide();
            $('.srv_qst_display_order').html('Left Message');
        } else if (checksrvmnu == 'DNC') {
            $(this).find('a').addClass('bottom-srv-dnc');
            $('#srv_intro_div').hide();
            $('.srv_qst_display_order').html('Do Not Call');
        } else if (checksrvmnu == 'Back') {
            $(this).find('a').addClass('bottom-srv-lm');
            
            
            
            console.log('in back');
            current_user_srv.srv_user.srv_current += -1;
            current_user_srv.srv_user.srv_next += -1;
            current_user_srv.srv_user.srv_back += -1;
            
            
            console.log(current_user_srv.srv_user);
            
            
            if ((current_user_srv.srv_user.srv_back == -1) || (current_user_srv.srv_user.srv_back == -2)) {
                $('.in_srv_fwdback_btn').hide(0, function () {
                    $('#srv_take').removeClass('active');
                    $('.intro_srv_btns').show();
                    $('#srv_intro_div').show();
                    $('.survey_question_div').hide();
                    $('.srv_qst_display_order').html('Survey Intro');
                    $('.srvqst_ans_div').hide();

                });
            } else {
                
                $('.survey_question_div').show();
                console.log(current_user_srv.srv_user.srv_current - 1);
                $('.survey_question_div').html('<h2>' + current_user_srv.srv_qst[current_user_srv.srv_user.srv_current - 1].qst_value + '</h2><br /><span style="font-size:22px;font-weight:bold; border-right :1px solid black;padding-right:15px" class="text-warning"> Agent Prompt </span><span style="font-size:22px;padding-left:15px" class="text-danger agent_prompt" >' + current_user_srv.srv_qst[current_user_srv.srv_user.srv_current - 1].qst_prompt + '</span>');
                $('.srvqst_ans_div').show();
                
                
                srv_qst_ans_get(current_user_srv.srv_qst[current_user_srv.srv_user.srv_current - 1].qst_type, obj_array_Search(current_user_srv.srv_ans, 'qst_order'
                    , current_user_srv.srv_user.srv_current), current_user_srv.srv_user.srv_current - 1
                ,current_user_srv.srv_qst[current_user_srv.srv_user.srv_current - 1].qst_max_value
                );
                
                console.log('question_type' + current_user_srv.srv_qst[current_user_srv.srv_user.srv_current - 1].qst_type);
                
                // console.log('type of question :' + srv_qst_ans_get(current_user_srv.srv_qst[current_user_srv.srv_user.srv_current - 1].qst_type, obj_array_Search(current_user_srv.srv_ans, 'qst_order', current_user_srv.srv_user.srv_current), current_user_srv.srv_user.srv_current - 1));
                
                
                
                
                orderdisp = current_user_srv.srv_user.srv_current;
                
                $('.srv_qst_display_order').html('Question | <b>' + orderdisp.toString() + '</b> of ' + current_user_srv.srv_qst.length);

            }


        } else if (checksrvmnu == 'Submit' || checksrvmnu == 'Next') {
            
            if (current_user_srv.srv_user.srv_current != current_user_srv.srv_qst.length) {
                
                $('.srvqst_ans_div').show();
                console.log('in submit');
                orderdisp = current_user_srv.srv_user.srv_current + 1;
                
                $('.srv_qst_display_order').html('Question | <b>' + orderdisp.toString() + '</b> of ' + current_user_srv.srv_qst.length);
                
                $('#srv_take').removeClass('active');
                
                $(this).find('a').addClass('bottom-srv-ts');
                
                current_user_srv.srv_user.srv_current += 1;
                current_user_srv.srv_user.srv_next += 1;
                current_user_srv.srv_user.srv_back += 1;
                
                
                

                
                $('.survey_question_div').html('<h2>' + current_user_srv.srv_qst[current_user_srv.srv_user.srv_current - 1].qst_value + '</h2><br /><span style="font-size:22px;font-weight:bold; border-right :1px solid black;padding-right:15px" class="text-warning"> Agent Prompt </span><span style="font-size:22px;padding-left:15px" class="text-danger agent_prompt" >' + current_user_srv.srv_qst[current_user_srv.srv_user.srv_current - 1].qst_prompt + '</span>').show();
                
                
                
                srv_qst_ans_get(current_user_srv.srv_qst[current_user_srv.srv_user.srv_current - 1].qst_type, 
                            obj_array_Search(current_user_srv.srv_ans, 'qst_order', current_user_srv.srv_user.srv_current), 
                            current_user_srv.srv_user.srv_current - 1,
                            current_user_srv.srv_qst[current_user_srv.srv_user.srv_current - 1].qst_max_value
                
                           
                );

          
                       // console.log('type of question :' + srv_qst_ans_get(current_user_srv.srv_qst[current_user_srv.srv_user.srv_current - 1].qst_type, obj_array_Search(current_user_srv.srv_ans, 'qst_order', current_user_srv.srv_user.srv_current), current_user_srv.srv_user.srv_current - 1));


            }
        }
        
        
        
        
        
        e.preventDefault();

    });

    






});



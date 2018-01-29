var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var sgTransport = require('nodemailer-sendgrid-transport');


// create reusable transporter object using the default SMTP transport
var smtpConfig = {
    host: 'smtp01.myhostedservice.com',
    port: '587',
    auth: { user: 'randolph.herron@realsmartcontact.com', pass: 'Loe!exe3!@#' },
    secureConnection: true,
    tls: { ciphers: 'SSLv3' }
};

var transporter = nodemailer.createTransport(smtpConfig);


var options = {
    auth: {
        api_key: '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'
    }
}

var mailer = nodemailer.createTransport(sgTransport(options));

/*
var mailOptions = {
    from: '"smart.contact.send" <smart.contact.send@gmail.com>', // sender address
    to: 'loe.exe@gmail.com', // list of receivers
    subject: 'Hello', // Subject line
    text: 'Hello world', // plaintext body
    html: '<b>Hello world</b>' // html body
};
*/

exports.sendmailcheck = function (mailOptions, email_queue_wk, fn) {
    mailer.sendMail(mailOptions, function (error, info) {
        if (error) {
            fn(0, email_queue_wk);
            console.log(error);
        } else {
            fn(1, email_queue_wk);
        }
    });
};






exports.sendmail_gen = function (mailOptions, fn) {
    mailer.sendMail(mailOptions, function (error, info) {
        if (error) {
            fn(0);
          
        } else {
            fn(mailOptions);
        }
    });
};





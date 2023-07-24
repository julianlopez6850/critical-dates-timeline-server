require('dotenv').config();
const { parentPort } = require('worker_threads');
const nodeMailer = require('nodemailer');
const { writeEmail } = require('../helpers/writeEmail');
const { getTodaysDate } = require('../helpers/getTodaysDate');
const { Users } = require('../models');
const customLog = require('../helpers/customLog');
const { leadingZero } = require('../helpers/leadingZero');

async function sendEmail() {
    //Transporter configuration
    let transporter = nodeMailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_EMAIL_PASSWORD
        }
    });
    
    const dayNames=['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // get Date object (if ENV is production, convert to EST timezone).
    const date = process.env.NODE_ENV === 'production' ?
        new Date(
            new Date().toLocaleString('en-US', {
                timeZone: 'America/New_York'
            })
        ) :
        new Date();
    // get day and time from Date object
    const day = dayNames[date.getDay()];
    const time = `${leadingZero(date.getHours())}:${leadingZero(date.getMinutes())}`;

    customLog.endpointLog(`${day.toUpperCase()} @ ${time}: SENDING OUT NOTIFICATION EMAILS`);

    const recipients = await Users.findAll({ attributes: ['username', 'email', 'settings'] });
    const recipientsArr = await recipients.map(item => {
        const settings = JSON.parse(item.dataValues.settings);

        for(key in settings) {
            if(key !== day)
                continue;

            customLog.endpointLog(`${(item.dataValues.username).toUpperCase()}:`);
            customLog.infoLog(`${day} setting: { active: ${settings[key].active + `, time: ${settings[key].time}`} }`);

            if(settings[key].active === false)
                return customLog.errorLog('Notification setting is turned off. Skipping this user.');
                
            var hrsDiff =  time.slice(0,2) - settings[key].time.slice(0,2);
            var minsDiff = time.slice(3,5) - settings[key].time.slice(3,5);
            
            if((Math.sign(hrsDiff) !== Math.sign(minsDiff)) && !(hrsDiff === 0) && !(minsDiff === 0)) {
                hrsDiff -= Math.sign(hrsDiff);
                minsDiff = -(Math.sign(minsDiff)*60) + minsDiff;
            }

            var approaching = false;
            if(minsDiff < 0 || hrsDiff < 0)
                approaching = true;

            hrsDiff = Math.abs(hrsDiff);
            minsDiff = Math.abs(minsDiff);
            
            customLog.infoLog(`${time} - ${settings[key].time}  = ${approaching ? '-' : ''}${leadingZero(hrsDiff)}:${leadingZero(minsDiff)}`);

            if(hrsDiff === 0 && Math.abs(minsDiff) <= 7) {
                customLog.messageLog(`${item.dataValues.username.toUpperCase()} will receive a notification NOW.`);
                return item.dataValues.email;
            }

            if(approaching) {
                customLog.messageLog(`${item.dataValues.username.toUpperCase()} will receive a notification in ${leadingZero(hrsDiff)} hrs, ${leadingZero(Math.floor((minsDiff + 7) / 15) * 15)} mins.`);
            } else
                customLog.messageLog(`${item.dataValues.username.toUpperCase()} has already received today's notification.`);
            return undefined;
        }
    });
    
    const filteredRecipients = recipientsArr.filter(recipient => recipient !== undefined);
    if(filteredRecipients.length === 0)
        return customLog.errorLog(`No notifications to send at ${day} ${time}. Stopping job.`);
    
    // get today's date in the format MM-DD-YY.
    const today = getTodaysDate();
    const MMDDYY = `${today.slice(-5)}-${today.slice(2,4)}`;

    // send the email to each recipient.
    customLog.messageLog(`Sending email to {${filteredRecipients}}...`);
    for(const recipient of filteredRecipients) {
        //Email configuration
        await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: recipient,
            subject: `${MMDDYY} Critical Times Update`,
            html: await writeEmail(recipient),
        }).then(() => {
            customLog.successLog(`Email sent successfully to ${recipient}!`);
        }).catch(() => {
            customLog.errorLog(`An error occurred while attempting to send email to ${recipient}.`);
        })
    }
}

sendEmail().catch(err => console.log(err));
require("dotenv").config()
const { workerData } = require("worker_threads");
const nodeMailer = require("nodemailer");
const { writeEmail } = require("../helpers/writeEmail");
const { getTodaysDate } = require('../helpers/getTodaysDate');

async function sendEmail() {
    console.log('Attempting to send email...');
    
    //Transporter configuration
    let transporter = nodeMailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.FROM_EMAIL,
            pass: process.env.PASSWORD
        }
    })
    
    const today = getTodaysDate();
    const MMDDYY = `${today.slice(-5)}-${today.slice(2,4)}`;

    const recipients = process.env.RECIPIENTS.split(' ');
    for(const recipient of recipients) {
        //Email configuration
        await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to: recipient,
            subject: `${MMDDYY} Critical Times Update`,
            html: await writeEmail(recipient),
        }).then(() => {
            console.log(`Email sent successfully to ${recipient}!`)
        })
    }
}

sendEmail().catch(err => console.log(err));
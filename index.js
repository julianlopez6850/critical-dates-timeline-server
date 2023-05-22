const express = require('express');
const app = express();
const cors = require("cors");
const Bree = require('bree')

app.use(express.json());
app.use(cors({
    credentials: true,
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
}));
//app.use(cookieParser());

const db = require('./models');

//Routers
const filesRouter = require("./routes/Files");
app.use("/files", filesRouter);
const datesRouter = require("./routes/Dates");
app.use("/dates", datesRouter);

const develomentCron = '* * * * *';    // occurs every minute.
const productionCron = '0 8 * * 1-5';   // occurs every weekday at 8:00 A.M.

// Email Scheduler
const bree = new Bree({
    jobs: [{
        name: 'sendEmail',
        cron: productionCron,
        worker: {
            workerData: {
                description: 'Job Started: Send Daily Critical Dates Email'
            }
        }
    }]
});

bree.start();

db.sequelize.sync().then(() => {
    app.listen(5000, () => {
        console.log("Server running on port 5000");
    })
})


const express = require('express');
const app = express();
const cors = require("cors");
const Bree = require('bree');
const cookieParser = require("cookie-parser");
const { validateToken } = require('./jsonWebTokens');
const customLog = require('./helpers/customLog');

app.use(express.json());

const originURLs = process.env.NODE_ENV === 'production' ? (process.env.PRODUCTION_URLS ? process.env.PRODUCTION_URLS.split(' ') : []) : 
process.env.DEVELOPMENT_URLS ? process.env.DEVELOPMENT_URLS.split(' ') : [];
app.use(cors({
    credentials: true,
    origin: originURLs
}));
app.use(cookieParser());

const db = require('./models');

// Routers
// Validate the user at every /files/* and /dates/* endpoint
const filesRouter = require("./routes/Files");
app.use("/files", validateToken, filesRouter);

const datesRouter = require("./routes/Dates");
app.use("/dates", validateToken, datesRouter);

const authRouter = require("./routes/Users");
app.use("/auth", authRouter);

// Email Scheduler
const bree = new Bree({
    jobs: [{
        name: 'sendEmail',
        cron: '*/15 * * * *',  // occurs every 15 minutes
        worker: {
            workerData: {
                description: 'Job Started: Send Daily Critical Dates Email'
            }
        }
    }]
});

bree.start();

db.sequelize.sync().then(() => {
    app.listen(process.env.PORT || 5000, () => {
        customLog.runLog('Server running on port 5000');
        customLog.runLog(`Server will process requests from the following origins: ${JSON.stringify(originURLs)}`);
    })
});


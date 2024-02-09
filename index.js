const express = require('express');
const app = express();
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');
const Bree = require('bree');
const cookieParser = require("cookie-parser");

const { validateToken } = require('./jsonWebTokens');
const customLog = require('./helpers/customLog');
const { requestInfoLogger, endpointLogger } = require('./helpers/infoLoggers');

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
app.use("/files", requestInfoLogger, validateToken, endpointLogger, filesRouter);

const datesRouter = require("./routes/Dates");
app.use("/dates", requestInfoLogger, validateToken, endpointLogger, datesRouter);

const authRouter = require("./routes/Users");
app.use("/auth", requestInfoLogger, authRouter);

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

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        credentials: true,
        origin: originURLs
    }
});

io.on('connection', (socket) => {
    customLog.socketLog(`USER CONNECTED: ${socket.id}`);
    socket.once('join_room', user => {
        customLog.socketLog(`USER JOINED ROOM: ${user} - ${socket.id}`);
        socket.join('all');
    });

    socket.on('update_others', data => {
        customLog.socketLog(`Data has been changed by user: ${socket.id}:`);
        socket.to('all').emit('receive_update', data);
    });

    socket.on('disconnect', () => {
        customLog.socketLog(`USER DISCONNECTED, ${socket.id}`);
    });
});
app.set('socket', io);

db.sequelize.sync().then(() => {
    server.listen(process.env.PORT || 5000, () => {
        customLog.runLog('Server running on port 5000');
        customLog.runLog(`Server will process requests from the following origins: ${JSON.stringify(originURLs)}`);
    })
});
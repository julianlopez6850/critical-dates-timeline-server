const customLog = require('./customLog')

const requestInfoLogger = (req) => {
    customLog.infoLog(`IP: ${req.ip}`);
    customLog.infoLog(`Access Token: ${req.cookies["access-token"]}`);
    customLog.infoLog(`Endpoint: ${req.baseUrl}${req.path}`);
    customLog.infoLog(`Body/Query Params: ${Object.keys(req.query).length === 0 ? JSON.stringify(req.body) : JSON.stringify(req.query)}`);
    return;
}

module.exports = { requestInfoLogger };
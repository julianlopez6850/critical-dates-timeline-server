const customLog = require('./customLog')

const requestInfoLogger = (req, res, next) => {
    customLog.validationLog('Request Info:');
    customLog.infoLog(`IP: ${req.ip}`);
    customLog.infoLog(`User-Agent: ${req.headers['user-agent']}`);
    customLog.infoLog(`Origin: ${req.headers['origin']}`);
    customLog.infoLog(`Referer: ${req.headers['referer']}`);
    customLog.infoLog(`Access Token: ${req.cookies['access-token']}`);
    customLog.infoLog(`Endpoint: ${req.method} ${req.baseUrl}${req.path}`);
    customLog.infoLog(`Body/Query Params: ${Object.keys(req.query).length === 0 ? JSON.stringify(req.body) : JSON.stringify(req.query)}`);
    return next();
}

const endpointLogger = (req, res, next) => {
    customLog.endpointLog(`Endpoint: ${req.method} ${req.baseUrl}${req.path}`, true);
    return next();
}

module.exports = { requestInfoLogger, endpointLogger };
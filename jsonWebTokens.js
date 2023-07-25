require('dotenv/config');
const { Users } = require('./models');
const customLog = require('./helpers/customLog');
const { sign, verify, decode } = require('jsonwebtoken');

const createToken = (user) => {
    const accessToken = sign(
        { username: user.username, password: user.password },
        process.env.JSON_WEB_TOKEN_SECRET,
        { expiresIn: "7d" }
    );

    return accessToken;
};

const validateToken = async (req, res, next) => {
    customLog.validationLog('VALIDATING USER ACCESS TOKEN');
    const accessToken = req.cookies["access-token"];

    if(!accessToken) {
        customLog.errorLog('ERROR: User not logged in; Aborting request.');
        return res.status(401).json({ error: "User not logged in." });
    }

    try {
        const validToken = verify(accessToken, process.env.JSON_WEB_TOKEN_SECRET);

        const user = await Users.findOne({ where: { username: validToken.username } });

        if(user && validToken.password === user.password) {
            req.authenticated = true;
            const decodedToken = decode(accessToken);
            req.username = decodedToken.username;

            customLog.successLog(`User Verified: {${decodedToken.username}}`);
            return next();
        }

        res.cookie('access-token', 'expired', {
            maxAge: 1000,
            httpOnly: true,
            sameSite: 'none',
            secure: true
        });
        customLog.errorLog('ERROR: User\'s credentials have been changed; User has been logged out. Aborting request.');
        return res.status(401).json({ error: 'User could not be authenticated. Aborting request.' });
    } catch (err) {
        customLog.errorLog('ERROR: Access token was not verified. Aborting request.');
        return res.status(401).json({ error: 'User could not be authenticated. Aborting request.' });
    }
}

module.exports = { createToken, validateToken };
require('dotenv/config');
const { Users } = require('./models');

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
    console.log('\x1b[45m%s\x1b[0m', 'VALIDATING USER ACCESS TOKEN');
    const accessToken = req.cookies["access-token"];

    console.log('\x1b[35m%s\x1b[0m', `IP: ${req.ip}`);
    console.log('\x1b[35m%s\x1b[0m', `Access Token: ${accessToken}`);
    console.log('\x1b[35m%s\x1b[0m', `Endpoint: ${req.baseUrl}${req.path}`);
    console.log('\x1b[35m%s\x1b[0m', `Body/Query Params: ${Object.keys(req.query).length === 0 ? JSON.stringify(req.body) : JSON.stringify(req.query)}`);

    if(!accessToken) {
        console.log('\x1b[31m%s\x1b[0m', 'User not logged in; Aborting request.');
        return res.status(401).json({ error: "User not logged in." });
    }

    try {
        const validToken = verify(accessToken, process.env.JSON_WEB_TOKEN_SECRET,);

        const user = await Users.findOne({ where: { username: validToken.username } });

        if(user && validToken.password === user.password) {
            req.authenticated = true;
            const decodedToken = decode(accessToken);
            req.username = decodedToken.username;

            console.log('\x1b[33m%s\x1b[0m', 'User Verified.');
            return next();
        }

        res.cookie('access-token', 'expired', {
            maxAge: 1000,
            httpOnly: true,
            sameSite: 'none',
            secure: true
        });
        console.log('\x1b[31m%s\x1b[0m', 'ERROR: User\'s credentials have been changed; User has been logged out. Aborting request.');
        return res.status(401).json({ error: 'User could not be authenticated. Aborting request.' });
    } catch (err) {
        console.log('\x1b[31m%s\x1b[0m', 'ERROR: Access token was not verified. Aborting request.');
        return res.status(401).json({ error: 'User could not be authenticated. Aborting request.' });
    }
}

module.exports = { createToken, validateToken };
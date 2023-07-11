const express = require('express');
const router = express.Router();
const { Users } = require('../models');
const bcrypt = require('bcrypt');
const { createToken, validateToken } = require('../jsonWebTokens');
const customLog = require('../helpers/customLog');
const { requestInfoLogger } = require('../helpers/requestInfoLogger');
const { verify } = require('jsonwebtoken');

// Login
router.post('/login', async (req, res) => {
    customLog.endpointLog('Endpoint: POST /auth/login');
    requestInfoLogger(req);

    const { username, password } = req.body;

    if(!(username && password)) {
        customLog.errorLog(`ERROR: Missing username and/or password. {${username}, ${password}}`);
        return res.status(400).json({ error: 'Missing username and/or password.' });
    }

    const userFound = await Users.findOne({ where: { username: username } });

    if (!userFound) {
        customLog.errorLog(`ERROR: Bad username and password combination. {${username}, ${password}}`);
        return res.status(400).json({ error: 'Wrong Username and Password Combination' });
    }

    bcrypt.compare(password, userFound.password).then((match) => {
        if (!match) {
            customLog.errorLog(`ERROR: Bad username and password combination. {${username}, ${password}}`);
            return res.status(400).json({ error: 'Wrong Username and Password Combination' });
        }

        const accessToken = createToken(userFound);
        res.cookie('access-token', accessToken, {
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: true,
            sameSite:'none',
            secure: true
        })

        customLog.successLog(`User {${username}} logged IN.`);
        res.status(200).json({ success: `User {${username.toUpperCase()}} logged IN.` });
    });
});

// Logout
router.post('/logout', async (req, res) => {
    customLog.endpointLog('Endpoint: POST /auth/logout');
    requestInfoLogger(req);

    res.cookie('access-token', 'expired', {
        maxAge: 1000,
        httpOnly: true,
        sameSite: 'none',
        secure: true
    })

    const accessToken = req.cookies["access-token"];
    const tokenPayload = verify(accessToken, process.env.JSON_WEB_TOKEN_SECRET);
    const username = tokenPayload.username;

    customLog.successLog(`User ${username} logged OUT.`)
    return res.status(200).json({ success: `User {${username.toUpperCase()}} logged OUT.` })
});

// Check if a user is logged in, and who that user is.
router.get('/profile', validateToken, async (req, res) => {
    customLog.endpointLog('Endpoint: GET /auth/profile');

    const user = await Users.findOne({ where: { username: req.username } });
    user.settings = JSON.parse(user.settings);

    customLog.successLog('User profile info sent to client.');
    res.status(200).json({ success: 'User authenticated.', username: req.username, settings: user.settings })
});

// Update user settings.
router.put('/settings', async (req, res) => {
    const { username, settings } = req.body;

    const user = await Users.findOne({ where: { username: username } });

    if(!user) {
        //ERROR. User not found
        return;
    }
    
    Users.update(
        { settings: JSON.stringify(settings) },
        { where: { username: username } }
    ).then(() => {
        customLog.successLog('Successfully updated settings.');
        return res.status(200).json({ success: 'Settings updated.', username: username, settings: settings });
    }).catch((err) => {
        customLog.errorLog('ERROR: An error occurred while trying to update the user\'s settings.');
        customLog.errorLog(err);
        return res.status(500).json({ message: 'The server has experienced an unexpected error.', error: err });
    })
});

module.exports = router;
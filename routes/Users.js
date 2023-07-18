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

    // If {username} and/or {password} is not provided in the request body, return and alert the user/client.
    if(!(username && password)) {
        customLog.errorLog(`ERROR: Missing username and/or password. {${username}, ${password}}`);
        return res.status(400).json({ error: 'Missing username and/or password.' });
    }

    const user = await Users.findOne({ where: { username: username } });
    // If user does not exist, return and alert the user/client.
    if(!user) {
        customLog.errorLog(`ERROR: Bad username and password combination. {${username}, ${password}}`);
        return res.status(400).json({ error: 'Wrong Username and Password Combination' });
    }

    // Compare {password} with the password stored in the database.
    bcrypt.compare(password, user.password).then((match) => {
        // If password does not match, return and alert the user/client.
        if (!match) {
            customLog.errorLog(`ERROR: Bad username and password combination. {${username}, ${password}}`);
            return res.status(400).json({ error: 'Wrong Username and Password Combination' });
        }

        // If all checks passed...
        // Log in the user (send an accessToken cookie to the client to keep the user logged in and authenticated).
        const accessToken = createToken(user);
        res.cookie('access-token', accessToken, {
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: true,
            sameSite:'none',
            secure: true
        });

        customLog.successLog(`User {${username}} logged IN.`);
        res.status(200).json({ success: `User {${username.toUpperCase()}} logged IN.` });
    });
});

// Logout
router.post('/logout', async (req, res) => {
    customLog.endpointLog('Endpoint: POST /auth/logout');
    requestInfoLogger(req);

    // Log out the user (expire their accessToken cookie).
    res.cookie('access-token', 'expired', {
        maxAge: 1000,
        httpOnly: true,
        sameSite: 'none',
        secure: true
    });

    const accessToken = req.cookies["access-token"];
    const tokenPayload = verify(accessToken, process.env.JSON_WEB_TOKEN_SECRET);
    const username = tokenPayload.username;

    customLog.successLog(`User {${username}} logged OUT.`);
    return res.status(200).json({ success: `User {${username.toUpperCase()}} logged OUT.` });
});

// Check if a user is logged in, and who that user is.
router.get('/profile', validateToken, async (req, res) => {
    customLog.endpointLog('Endpoint: GET /auth/profile');

    const user = await Users.findOne({ where: { username: req.username } });
    user.settings = JSON.parse(user.settings);

    customLog.successLog('User profile info sent to client.');
    res.status(200).json({ success: 'User authenticated.', username: req.username, settings: user.settings });
});

// Update user settings.
router.put('/settings', validateToken, async (req, res) => {
    const { username, settings } = req.body;

    // If {username} is not provided in the request body, return and alert the user/client.
    if(!username) {
        customLog.errorLog('ERROR: Missing required username parameter. Aborting request.');
        return res.status(400).json({ error: 'Missing required username parameter.' });
    }

    // If {settings} is not provided in the request body, return and alert the user/client.
    if(!settings) {
        customLog.errorLog('ERROR: Missing required settings parameter. Aborting request.');
        return res.status(400).json({ error: 'Missing required settings parameter.' });
    }

    const accessToken = req.cookies["access-token"];
    const tokenPayload = verify(accessToken, process.env.JSON_WEB_TOKEN_SECRET);
    const verifyUser = tokenPayload.username;

    // If {username} does not match the username within the passed accessToken, return and log out the user.
    if(username !== verifyUser) {
        res.cookie('access-token', 'expired', {
            maxAge: 1000,
            httpOnly: true,
            sameSite: 'none',
            secure: true
        });

        customLog.errorLog('ERROR: The provided username does not match the one stored within accessToken. Aborting request.');
        return res.status(400).json({ error: 'The username provided does not match your username!' });
    }

    const user = await Users.findOne({ where: { username: username } });
    // If user does not exist, return and alert the user/client.
    if(!user) {
        customLog.errorLog('ERROR: The provided username does not exist. Aborting request.');
        return res.status(400).json({ error: 'The provided username does not exist.' });
    }
    
    // Update the User's settings.
    Users.update(
        { settings: settings },
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
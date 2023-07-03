const express = require("express");
const router = express.Router();
const { Users } = require("../models");
const bcrypt = require("bcrypt");
const { createToken, validateToken } = require("../jsonWebTokens");

// Login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const userFound = await Users.findOne({ where: { username: username } });

    if (!userFound)
        return res.status(400).json({ error: "User Not Found" });

    bcrypt.compare(password, userFound.password).then((match) => {
        if (!match)
            return res.status(400).json({ error: "Wrong Username and Password Combination" });

        const accessToken = createToken(userFound);
        res.cookie("access-token", accessToken, {
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: true,
            sameSite:'none',
            secure: true
        })

        res.status(200).json({ success: `User logged in as ${username.toUpperCase()}` });
    });
});

// Logout
router.post("/logout", async (req, res) => {
    res.cookie("access-token", 'expired', {
        maxAge: 1000,
        httpOnly: true,
        sameSite: 'none',
        secure: true
    })

    return res.status(200).json({ success: "User logged out successfully." })
});

// Check if a user is logged in, and who that user is.
router.get("/profile", validateToken, async (req, res) => {
    const user = await Users.findOne({ where: { username: req.username } });
    user.settings = JSON.parse(user.settings);

    res.status(200).json({ success: "User authenticated.", username: req.username, settings: user.settings })
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
        console.log('SETTINGS UPDATED');
        return res.status(200).json({ success: 'Settings updated.', username: username, settings: settings });
    }).catch((err) => {
        console.log(err)
        return res.status(400).json({ errorMessage: 'Error updating settings.', error: err });
    })
});

module.exports = router;
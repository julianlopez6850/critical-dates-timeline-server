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
        res.cookie("access-token", accessToken, { maxAge: 1000 * 60 * 60 * 24 * 7 })

        res.status(200).json({ success: "Login successful." });
    });
});

// Logout
router.post("/logout", async (req, res) => {
	res.cookie("access-token", 'expired', {
		maxAge: 1000,
		httpOnly: true
	})
	return res.status(200).json({ success: "User logged out successfully." })
});

// Check if a user is logged in, and who that user is.
router.get("/profile", validateToken, async (req, res) => {
    const user = await Users.findOne({ where: { username: req.username } });
    user.settings = JSON.parse(user.settings);

    res.status(200).json({ success: "User authenticated.", username: req.username, settings: user.settings })
});

module.exports = router;
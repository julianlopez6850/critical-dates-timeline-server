const express = require('express');
const router = express.Router();
const { Dates } = require('../models');
const sequelize = require('sequelize');
const Op = sequelize.Op

// Get all critical dates.
router.get("/all", async (req, res) => {
    const criticalDates = await Dates.findAll();
    res.json(criticalDates);
});

router.get("/", async (req, res) => {

    try {
        const { startDate, endDate, limit, type} = req.query;

        var datesQuery = {}

        var message = [];

        if(startDate && !(endDate || limit) || (endDate || limit) && !startDate) {
            message.push('startDate provided without endDate/limit, or vice versa. Searching for all dates.')
        }
        if(endDate && limit) {
            return res.status(400).json({ error: "Cannot define BOTH endDate AND limit." });
        }

        // if limit or endDate are defined,
        if(limit) {
            var start = new Date(startDate);
            start.setDate(start.getDate() + parseInt(limit));
            var end = `${start.getUTCFullYear()}-${(start.getUTCMonth() + 1).toString().padStart(2, '0')}-${start.getUTCDate()}`
            datesQuery.date = { [Op.between]: [startDate, end] }
        } else if(endDate) {
            datesQuery.date = { [Op.between]: [startDate, endDate] }
        }

        if(type) {
            datesQuery.type = type;
        }

        console.log(datesQuery);

        const criticalDates = await Dates.findAll({
            where: datesQuery
        });

        return res.status(200).json({dates: criticalDates, message: message})
    } catch(err) {
        return res.status(400).json(err)
    }
});

module.exports = router;
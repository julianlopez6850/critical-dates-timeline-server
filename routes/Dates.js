const express = require('express');
const router = express.Router();
const { Dates, Files } = require('../models');
const sequelize = require('sequelize');
const Op = sequelize.Op
const customLog = require('../helpers/customLog');

// Get Dates that match the user-defined attributes passed in query parameters:
// WHERE date: BETWEEN {startDate} (optional, defaults to '01-01-0001') AND {endDate} (optional, defaults to '12-31-9999')
// AND type: {type} (optional, defaults to all)
// AND isClosed: {isClosed} (optional, defaults to all)
// ORDER BY {sort} (optional, defaults to order['date', 'ASC'])
// (If NO query parameters are passed, ALL Dates in database are returned).
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, type, isClosed, sort} = req.query;

        var queryWhere = {}

        // If startDate and/or endDate is defined, search for Dates with a date field within the
        // range [startDate, endDate] (if one value is not defined, set it to its respective limit).
        if(startDate || endDate)
            queryWhere.date = { [Op.between]: [startDate || '0001-01-01', endDate || '9999-12-31'] };

        if(type && type !== '')
            queryWhere.type = type;
        
        customLog.messageLog('Retrieving all Dates that match the given criteria, along with each Date\'s File info...');

        // Include info of the File that each Date belongs to.
        const queryInclude =  [{
            model: Files,
            attributes: ['buyer', 'seller', 'address', 'isClosed']
        }];

        // Order the resulting data according to the defined sort column and direction
        // (if sort is not defined, order is defaulted to Ascending by 'Date'.'date').
        var sortTable = 'Dates';
        var sortBy = 'Date';
        var sortDir = 'ASC';

        if(sort) {
            splitSort = sort.split(',')
            sortBy = splitSort[0];
            if(!(sortBy === 'Date'))
                sortTable = 'Files';
            sortDir = splitSort[1];
        }

        const queryOrder = [
            sortTable === 'Dates' ?
            [ sortBy, sortDir ] :
            [ Files, sortBy, sortDir ]
        ];

        var criticalDates = [];
        if(isClosed === 'true') {
            // When isClosed = 'true', res includes Dates WHERE
            // 'Dates'.'isClosed': 1 OR 'File'.'isClosed': 1 AND all other parameters are met.
            criticalDates = await Dates.findAll({
                where: {
                    [Op.and]: [
                        queryWhere,
                        {[Op.or]: [
                            { isClosed: 1 },
                            { '$File.isClosed$': 1 }
                        ]}
                    ]
                },
                include: queryInclude,
                order: queryOrder
            });
        } else if(isClosed === 'false') {
            // When isClosed = 'false', res includes Dates WHERE
            // 'Dates'.'isClosed': 0 AND 'File'.'isClosed': 0 AND all other parameters are met.
            criticalDates = await Dates.findAll({
                where: { ...queryWhere, isClosed: 0, '$File.isClosed$': 0 },
                include: queryInclude,
                order: queryOrder
            });
        } else {
            // If isClosed is not defined (or defined as something other than 'true'/'false'), res includes Dates WHERE
            // all other parameters are met, regardless of isClosed property.
            criticalDates = await Dates.findAll({
                where: queryWhere,
                include: queryInclude,
                order: queryOrder
            });
        }

        if(criticalDates.length === 0) {
            customLog.successLog('No Dates were found matching the given criteria.');
            return res.status(200).json({ dates: criticalDates });
        }

        customLog.successLog('Finished retrieving Dates that match the criteria.');
        return res.status(200).json({ dates: criticalDates, length: criticalDates.length });
    } catch(err) {
        customLog.errorLog('ERROR: An error occurred while trying to retrieve the Dates and their respective File information.');
        customLog.errorLog(err);
        return res.status(500).json({ message: 'The server has experienced an unexpected error.', error: err });
    }
});

// Update a Date.
router.put('/', async (req, res) => {
    const { fileNumber, type, prefix, date, isClosed } = req.body;

    customLog.messageLog(`Updating Date ${fileNumber} ${prefix}${type}...`);

    var updatedValues = {};
    if(date)
        updatedValues.date = date;
    if(isClosed)
        updatedValues.isClosed = isClosed;

    const oldDate = await Dates.findOne({ where: { fileNumber: fileNumber, type: type, prefix: prefix } });

    // Update the Date record.
    oldDate.update(
        { date: date, isClosed: isClosed }
    ).then(() => {
        customLog.successLog(`Successfully updated ${fileNumber} ${prefix}${type} date. Updated date info:`);
        customLog.infoLog({
            fileNumber: fileNumber,
            type: `${prefix}${type}`,
            date: date ? date : oldDate.date,
            isClosed: isClosed ? isClosed : oldDate.isClosed
        });
        return res.status(200).json({ success: 'Successfully updated date.' });
    }).catch((err) => {
        customLog.errorLog('ERROR: An error occurred while trying to update the Date.');
        customLog.errorLog(err);
        return res.status(500).json({ message: 'The server has experienced an unexpected error.', error: err });
    })
})

module.exports = router;
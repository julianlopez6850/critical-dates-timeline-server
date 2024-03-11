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
        const { startDate, endDate, type, isClosed, sort, dealType, limit = 10000, pageNum = 1, include } = req.query;
        var includeArr = []
        if(include)
            includeArr = include.split(',');

        if(limit && pageNum) {
            offset = parseInt(limit) * (Math.max(parseInt(pageNum), 1) - 1);
        }

        var queryWhere = {}

        // If startDate and/or endDate is defined, search for Dates with a date field within the
        // range [startDate, endDate] (if one value is not defined, set it to its respective limit).
        if(startDate || endDate)
            queryWhere.date = { [Op.between]: [startDate || '0001-01-01', endDate || '9999-12-31'] };

        if(type && type !== '')
            queryWhere.type = type;
        
        customLog.messageLog('Retrieving all Dates that match the given criteria, along with each Date\'s File info...');

        // Include info of the File that each Date belongs to.
        const queryInclude =  {
            model: Files,
            attributes: [
                'fileRef',
                'buyer',
                'seller',
                'address',
                'whoRepresenting',
                'isPurchase',
                'status'
            ].concat(includeArr)
        };

        if(dealType && dealType !== '') {
            queryInclude.where = (dealType === 'Refinance' ?
                { isPurchase: false } :
                dealType === 'Sale' ?
                    { isPurchase: true, [Op.not]: {whoRepresenting: 'Buyer' } } :
                    { isPurchase: true, [Op.not]: {whoRepresenting: 'Seller' } }
            )
        }

        // Order the resulting data according to the defined sort column and direction. 
        // Secondary ordering by fileNumber, then date.
        // ex. if sortBy='Buyer' & sortDir='DESC' -> 'ORDER BY 'File'.buyer, fileNumber, date DESC'
        // (if sort is not defined, order is defaulted to Ascending by 'Date'.'date', then 'Date'.'fileNumber').
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
        
        const queryOrder = sortTable === 'Dates' ? (
            [[`date`, sortDir], ['fileNumber', sortDir]] ) : (
            [[ Files, sortBy, sortDir ], ['fileNumber', sortDir], [`date`, sortDir]]
        );

        var criticalDates = [];
        if(isClosed === 'true') {
            // When isClosed = 'true', res includes Dates WHERE
            // 'Dates'.'isClosed': 1 OR 'File'.'isClosed': 1 AND all other parameters are met.
            criticalDates = await Dates.findAndCountAll({
                where: {
                    [Op.and]: [
                        queryWhere,
                        {[Op.or]: [
                            { isClosed: 1 },
                            {[Op.not]: [{ '$File.status$': 'Open' }]}
                        ]}
                    ]
                },
                include: queryInclude,
                order: queryOrder,
                offset: offset,
                limit: parseInt(limit),
            });
        } else if(isClosed === 'false') {
            // When isClosed = 'false', res includes Dates WHERE
            // 'Dates'.'isClosed': 0 AND 'File'.'isClosed': 0 AND all other parameters are met.
            criticalDates = await Dates.findAndCountAll({
                where: { ...queryWhere, isClosed: 0, '$File.status$': 'Open' },
                include: queryInclude,
                order: queryOrder,
                offset: offset,
                limit: parseInt(limit),
            });
        } else {
            // If isClosed is not defined (or defined as something other than 'true'/'false'), res includes Dates WHERE
            // all other parameters are met, regardless of isClosed property.
            criticalDates = await Dates.findAndCountAll({
                where: queryWhere,
                include: queryInclude,
                order: queryOrder,
                offset: offset,
                limit: parseInt(limit),
            });
        }

        const numReturned = criticalDates.rows.length;
        if(numReturned === 0) {
            customLog.successLog('No Dates were found matching the given criteria.');
            return res.status(200).json({ dates: criticalDates.rows, pageLength: numReturned, total: criticalDates.count });
        }

        customLog.successLog('Finished retrieving Dates that match the criteria.');
        return res.status(200).json({ dates: criticalDates.rows, pageLength: numReturned, start: offset + 1, end: offset + numReturned, total: criticalDates.count });
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
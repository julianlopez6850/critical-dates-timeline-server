const express = require('express');
const router = express.Router();
const { Dates, Files } = require('../models');
const sequelize = require('sequelize');
const Op = sequelize.Op
const customLog = require('../helpers/customLog');

// Get all critical dates.
router.get('/all', async (res) => {
    customLog.endpointLog('Endpoint: GET /dates/all');

    const criticalDates = await Dates.findAll({ attributes: { exclude: ['createdAt', 'updatedAt'] }, order: [['date', 'ASC']] });

    // Get file info for each date    
    for(var date of criticalDates) {
        const fileInfo = await Files.findOne({
            where: { fileNumber: date.fileNumber }
        });

        for(const info in fileInfo.dataValues) {
            if(info === 'isClosed')
                date.dataValues['isFileClosed'] = fileInfo.dataValues[info];
            else
                date.dataValues[`${info}`] = fileInfo.dataValues[info];
        }
    }

    return res.status(200).json({ dates: criticalDates });
});

router.get('/', async (req, res) => {
    customLog.endpointLog('Endpoint: GET /dates');

    try {
        const { startDate, endDate, type, isClosed} = req.query;

        var datesQuery = {}

        // if startDate and/or endDate is defined, search for Dates with a date field within the
        // range [startDate, endDate] (if one value is not defined, set it to its respective limit).
        if(startDate || endDate) {
            datesQuery.date = { [Op.between]: [startDate || '1000-01-01', endDate || '9999-12-31'] };
        }

        if(type && type !== '') {
            datesQuery.type = type;
        }

        if(isClosed && isClosed !== '') {
            datesQuery.isClosed = isClosed === 'true' ? 1 : 0;
        }

        // get the fileNumbers of all CLOSED files (i.e. isClosed === 1)
        const closedFiles = await Files.findAll({
            where: { isClosed: 1 }
        });

        var closedFileNumbers = []
        for(const file of closedFiles) {
            closedFileNumbers.push(file.dataValues.fileNumber);
        }

        var criticalDates = []
        
        customLog.messageLog('Retrieving all Dates that match the given criteria...');

        if(isClosed === 'true') {
            // When isClosed query param = 'true', res includes Dates where all parameters are met OR 
            // where the date's associated file is CLOSED (i.e. 'Files'.'isClosed' = 1).
            criticalDates = await Dates.findAll({
                where: {
                    [Op.or]: [
                        datesQuery,
                        { ...datesQuery, fileNumber: { [Op.in]: closedFileNumbers } }
                    ]
                },
                order: [['date', 'ASC']]
            });
        } else if(isClosed === 'false') {
            // When isClosed === 'false', res includes Dates where all parameters are met AND 
            // where the date's associated file is NOT CLOSED (i.e. 'Files'.'isClosed' = 0).
            criticalDates = await Dates.findAll({
                where: {
                    [Op.and]: [
                        datesQuery,
                        {
                            fileNumber: {
                                [Op.notIn]: closedFileNumbers
                            }
                        }
                    ]
                },
                order: [['date', 'ASC']]
            });
        } else {
            // if isClosed is not defined, or it is not 'true'/'false', 
            // res only includes Dates where all other parameters are met.
            criticalDates = await Dates.findAll({
                where: datesQuery,
                order: [['date', 'ASC']]
            });
        }

        if(criticalDates.length === 0) {
            customLog.successLog('No Dates were found matching the given criteria.');
            return res.status(200).json({ dates: criticalDates });
        }

        customLog.successLog('Finished retieving Dates that match the criteria.');
        customLog.messageLog('Retrieving File info for each Date found above...');
        
        // for each date in the criticalDates array, get its respective file info and append it.
        for(var date of criticalDates) {
            const fileInfo = await Files.findOne({
                where: { fileNumber: date.fileNumber }
            });

            if(fileInfo) {
                for(const info in fileInfo.dataValues) {
                    if(info === 'isClosed')
                        date.dataValues['isFileClosed'] = fileInfo.dataValues[info];
                    else
                        date.dataValues[`${info}`] = fileInfo.dataValues[info];
                }
            }
        }

        customLog.successLog('Finished retrieving all necessary info for each Date.');
        return res.status(200).json({ dates: criticalDates });
    } catch(err) {
        customLog.errorLog('ERROR: An error occurred while trying to retrieve the Dates and their respective File information.');
        customLog.errorLog(err);
        return res.status(500).json({ message: 'The server has experienced an unexpected error.', error: err });
    }
});

router.put('/', async (req, res) => {
    customLog.endpointLog('Endpoint: PUT /dates');

    const { fileNumber, type, prefix, date, isClosed } = req.body;

    customLog.messageLog(`Updating Date ${fileNumber} ${prefix}${type}...`);

    var updatedValues = {};

    if(date) {
        updatedValues.date = date;
    }
    if(isClosed) {
        updatedValues.isClosed = isClosed;
    }

    const oldDateInfo = await Dates.findOne({ where: { fileNumber: fileNumber, type: type, prefix: prefix }});

    Dates.update(
        { date: date, isClosed: isClosed },
        { where: { fileNumber: fileNumber, type: type, prefix: prefix }}
    ).then(() => {
        customLog.successLog(`Successfully updated ${fileNumber} ${prefix}${type} date. Updated date info:`);
        customLog.infoLog({
            fileNumber: fileNumber,
            type: `${prefix}${type}`,
            date: date ? date : oldDateInfo.date,
            isClosed: isClosed ? isClosed : oldDateInfo.isClosed
        });
        return res.status(200).json({ success: 'Successfully updated date.' });
    }).catch((err) => {
        customLog.errorLog('ERROR: An error occurred while trying to update the Date.');
        customLog.errorLog(err);
        return res.status(500).json({ message: 'The server has experienced an unexpected error.', error: err });
    })
})

module.exports = router;
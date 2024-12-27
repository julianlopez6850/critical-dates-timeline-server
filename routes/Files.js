const express = require('express');
const router = express.Router();
const { Files, Dates } = require('../models');
const sequelize = require('sequelize');
const customLog = require('../helpers/customLog');
const Op = sequelize.Op

// Get all Files.
// Only return attributes: ['fileNumber', 'fileRef', 'buyer', 'seller', 'address', 'status'] for each File.
router.get('/all', async (req, res) => {
    const { include } = req.query;
    var includeArr = []
    if(include)
        includeArr = include.split(',');
    
    customLog.messageLog('Retrieving info for all files...');
    const files = await Files.findAll({
        attributes: [
            'fileNumber',
            'fileRef',
            'buyer',
            'seller',
            'address',
            'status'
        ].concat(includeArr),
        order: [['fileNumber', 'DESC']]
    });

    customLog.successLog('Successfully sent info for all files.');
    return res.status(200).json({ files: files });
});

// Get a single File by fileNumber (required).
router.get('/', async (req, res) => {
    try {
        const { fileNumber } = req.query;

        customLog.messageLog(`Retrieving info for file ${fileNumber}...`);
        
        // Find the File, include its associated Dates.
        const file = await Files.findOne({
            where: { fileNumber: fileNumber },
            include: [{ model: Dates }]
        });

        // For each Date associated with the File, parse its calculatedDate value from a string into a JSON object.
        for(const date of file.Dates) {
            date.dataValues.calculatedDate = JSON.parse(date.dataValues.calculatedDate);
        }

        customLog.successLog(`Successfully sent info for file ${fileNumber}.`);
        return res.status(200).json({ file: file });
    } catch(err) {
        customLog.errorLog('ERROR: An error occurred while trying to retrieve the File.');
        customLog.errorLog(err);
        return res.status(500).json({ message: 'The server has experienced an unexpected error.', error: err });
    }
});


// Post a new File.
router.post('/', async (req, res) => {
    const newFile = req.body;

    // If {fileNumber} is not provided in the request body, return and alert the user/client.
    if(!newFile.fileNumber) {
        customLog.errorLog('ERROR: Missing required fileNumber parameter. Aborting request.');
        return res.status(400).json({ error: 'Missing required fileNumber parameter.' });
    };

    const existingFile = await Files.findOne({ where: {fileNumber: newFile.fileNumber }});

    // If the {fileNumber} provided is already in use, return and alert the user/client.
    if(existingFile) {
        customLog.errorLog('ERROR: A file already exists with that file number.');
        return res.status(400).json({ message: 'This file already exists.', file: existingFile});
    }

    customLog.messageLog(`Posting new file, #${newFile.fileNumber}...`);

    try {
        // Create the new file.
        newFile.status = 'Open';
        await Files.create(newFile);

        const defaultCalculatedDate = JSON.stringify({isCalculated: false, numDays: 3, direction: 1, from:'Effective', otherDate:''});

        // Create each new Date associated with the new File.
        if(newFile.effective) {
            await Dates.create({
                date: newFile.effective,
                fileNumber: newFile.fileNumber,
                type: 'Effective',
                prefix: '',
                isClosed: true,
                calculatedDate: null
            });
        }
        if(newFile.depositInitial) {
            await Dates.create({
                date: newFile.depositInitial,
                fileNumber: newFile.fileNumber,
                type: 'Escrow',
                prefix: 'First ',
                isClosed: newFile.isClosedDepositInitial,
                calculatedDate: Object.keys(newFile.isCalculatedDepositInitial).length > 0 ?
                    JSON.stringify(newFile.isCalculatedDepositInitial) :
                    defaultCalculatedDate
            });
        }
        if(newFile.depositSecond) {
            await Dates.create({
                date: newFile.depositSecond,
                fileNumber: newFile.fileNumber,
                type: 'Escrow',
                prefix: 'Second ',
                isClosed: newFile.isClosedDepositSecond,
                calculatedDate: Object.keys(newFile.isCalculatedDepositSecond).length > 0 ?
                    JSON.stringify(newFile.isCalculatedDepositSecond) :
                    defaultCalculatedDate
            });
        }
        if(newFile.loanApproval) {
            await Dates.create({
                date: newFile.loanApproval,
                fileNumber: newFile.fileNumber,
                type: 'Loan Approval',
                prefix: '',
                isClosed: newFile.isClosedLoanApproval,
                calculatedDate: Object.keys(newFile.isCalculatedLoanApproval).length > 0 ?
                    JSON.stringify(newFile.isCalculatedLoanApproval) :
                    defaultCalculatedDate
            });
        }
        if(newFile.inspection) {
            await Dates.create({
                date: newFile.inspection,
                fileNumber: newFile.fileNumber,
                type: 'Inspection',
                prefix: '',
                isClosed: newFile.isClosedInspection,
                calculatedDate: Object.keys(newFile.isCalculatedInspection).length > 0 ?
                    JSON.stringify(newFile.isCalculatedInspection) :
                    defaultCalculatedDate
            });
        }
        if(newFile.closing) {
            await Dates.create({
                date: newFile.closing,
                fileNumber: newFile.fileNumber,
                type: 'Closing',
                prefix: '',
                isClosed: newFile.isClosedClosing,
                calculatedDate: Object.keys(newFile.isCalculatedClosing).length > 0 ?
                    JSON.stringify(newFile.isCalculatedClosing) :
                    defaultCalculatedDate
            });
        }

        customLog.successLog(`Successfully posted file ${newFile.fileNumber}:`);
        customLog.infoLog(newFile);
        return res.status(200).json({ message: 'Successfully added new file and associated critical dates.', file: newFile });
    } catch (err) {
        customLog.errorLog('ERROR: An error occurred while trying to post the new File.');
        customLog.errorLog(err);
        return res.status(500).json({ message: 'The server has experienced an unexpected error.', error: err });
    }
});

// Update a File.
router.put('/', async (req, res) => {
    const { oldFileNumber } = req.body;
    delete req.body.oldFileNumber;
    const updatedFile = req.body;

    // If {oldFileNumber} is not provided in the request body, return and alert the user/client.
    if(!oldFileNumber) {
        customLog.errorLog('ERROR: Missing required oldFileNumber parameter. Aborting request.');
        return res.status(400).json({ error: 'Missing required oldFileNumber parameter.' });
    }

    customLog.messageLog(`Updating file ${oldFileNumber}...`);

    try {
        // Update the File record.
        Files.update(
            updatedFile,
            {where: { fileNumber: oldFileNumber}}
        ).then( async () => {
            customLog.messageLog(`Updating file ${oldFileNumber} critical dates...`);
            // Then update each Date record that belongs to that File
            const {
                effective,
                depositInitial,
                depositSecond,
                loanApproval,
                inspection,
                closing,
                isClosedEffective,
                isClosedDepositInitial,
                isClosedDepositSecond,
                isClosedLoanApproval,
                isClosedInspection,
                isClosedClosing,
                isCalculatedDepositInitial,
                isCalculatedDepositSecond,
                isCalculatedLoanApproval,
                isCalculatedInspection,
                isCalculatedClosing
            } = updatedFile;

            const defaultCalculatedDate = JSON.stringify({isCalculated: false, numDays: 3, direction: 1, from:'Effective', otherDate:''});

            const dates = [
                {
                    type: 'Effective',
                    date: effective,
                    isClosed: isClosedEffective,
                    prefix: '',
                    calculatedDate: null
                },
                {
                    type: 'Escrow',
                    date: depositInitial,
                    isClosed: isClosedDepositInitial,
                    prefix: 'First ',
                    calculatedDate: JSON.stringify(isCalculatedDepositInitial) || defaultCalculatedDate
                },
                {
                    type: 'Escrow',
                    date: depositSecond,
                    isClosed: isClosedDepositSecond,
                    prefix: 'Second ',
                    calculatedDate: JSON.stringify(isCalculatedDepositSecond) || defaultCalculatedDate
                },
                {
                    type: 'Loan Approval',
                    date: loanApproval,
                    isClosed: isClosedLoanApproval,
                    prefix: '',
                    calculatedDate: JSON.stringify(isCalculatedLoanApproval) || defaultCalculatedDate
                },
                {
                    type: 'Inspection',
                    date: inspection,
                    isClosed: isClosedInspection,
                    prefix: '',
                    calculatedDate: JSON.stringify(isCalculatedInspection) || defaultCalculatedDate
                },
                {
                    type: 'Closing',
                    date: closing,
                    isClosed: isClosedClosing,
                    prefix: '',
                    calculatedDate: JSON.stringify(isCalculatedClosing) || defaultCalculatedDate
                },
            ];

            for(const date of dates) {
                customLog.messageLog(`Checking ${updatedFile.fileNumber} ${date.prefix}${date.type} date...`);
                customLog.infoLog(`Passed Date info: { date: ${date.date}, isClosed: ${date.isClosed}, calculatedDate: ${date.calculatedDate} }.`);

                // Delete an existing date if it was removed by the user.
                if(!date.date) {
                    await Dates.findOne({
                        where: {
                            fileNumber: updatedFile.fileNumber,
                            type: date.type,
                            prefix: date.prefix
                        }
                    }).then( async (existingDate) => {
                        if(existingDate === null) return customLog.successLog(`${updatedFile.fileNumber} ${date.prefix}${date.type} DATE: NOTHING TO DO (No existing date, no date entered). Continuing...`);
                        await existingDate.destroy().then(() => {
                            customLog.successLog(`${updatedFile.fileNumber} ${date.prefix}${date.type} DATE: DELETED. Continuing...`);
                        });
                    });
                    continue;
                }

                // Create a new Date or Update an existing Date if necessary.
                await Dates.findOne({
                    where: {
                        fileNumber: updatedFile.fileNumber,
                        type: date.type,
                        prefix: date.prefix
                    }
                }).then( async (existingDate) => {
                    if(existingDate === null) {
                        await Dates.create({
                            date: date.date,
                            calculatedDate: date.calculatedDate,
                            fileNumber: updatedFile.fileNumber,
                            type: date.type,
                            prefix: date.prefix,
                            isClosed: date.isClosed,
                        }).then(() => {
                            customLog.successLog(`${updatedFile.fileNumber} ${date.prefix}${date.type} DATE: CREATED. Continuing...`);
                        });
                        return;
                    }
                    if(existingDate.date === date.date && existingDate.isClosed == date.isClosed && existingDate.calculatedDate === date.calculatedDate) {
                        customLog.successLog(`${updatedFile.fileNumber} ${date.prefix}${date.type} DATE: NOTHING TO DO (No changes made to existing date). Continuing...`);
                        return;
                    }
                    await existingDate.update({
                        date: date.date,
                        isClosed: date.isClosed,
                        calculatedDate: date.calculatedDate
                    }).then(() => {
                        customLog.successLog(`${updatedFile.fileNumber} ${date.prefix}${date.type} DATE: UPDATED. Continuing...`);
                    });
                })
            }
            
            customLog.successLog(`Successfully updated file ${oldFileNumber}. Updated file info:`);
            customLog.infoLog(updatedFile);
            return res.status(200).json({ success: 'File updated.', file: updatedFile });
        })
    } catch(err) {
        customLog.errorLog('ERROR: An error occurred while trying to update the File.');
        customLog.errorLog(err);
        return res.status(500).json({ message: 'The server has experienced an unexpected error.', error: err });
    }
});

// Delete a File.
router.delete('/', async (req, res) => {
    const { fileNumber } = req.body;

    // If {fileNumber} is not provided in the request body, return and alert the user/client.
    if(!fileNumber) {
        customLog.errorLog('ERROR: Missing required fileNumber parameter; Aborting request.');
        return res.status(400).json({ error: 'Missing required fileNumber parameter.' });
    }
    
    customLog.messageLog(`Deleting file ${fileNumber}...`);

    try {
        // Find and delete File {fileNumber}.
        const file = await Files.findOne({ where: { fileNumber: fileNumber } });
        file.destroy();
    
        customLog.successLog(`Successfully deleted file ${fileNumber}...`);
        return res.status(200).json({ success: `File ${fileNumber} and all associated dates have been deleted.`});
    } catch(err) {
        customLog.errorLog('ERROR: An error occurred while trying to delete the File.');
        customLog.errorLog(err);
        return res.status(500).json({ message: 'The server has experienced an unexpected error.', error: err });
    }
});

module.exports = router;
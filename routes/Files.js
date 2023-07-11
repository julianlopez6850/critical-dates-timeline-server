const express = require('express');
const router = express.Router();
const { Files, Dates } = require('../models');
const Sequelize = require('sequelize');
const customLog = require('../helpers/customLog');

const sequelize = new Sequelize('critical-dates-schedule', 'root', 'password', {
    host: 'localhost',
    dialect: 'mysql',
  });

// Get all files.
router.get('/all', async (req, res) => {
    customLog.endpointLog('Endpoint: GET /files/all');

    customLog.messageLog('Retrieving info for all files...');
    const files = await Files.findAll();

    customLog.successLog('Successfully sent info for all files.');
    return res.status(200).json({ files: files });
});

// Get single file by fileNumber.
router.get('/', async (req, res) => {
    customLog.endpointLog('Endpoint: GET /files');

    try {
        const { fileNumber } = req.query;

        customLog.messageLog(`Retrieving info for file ${fileNumber}...`);
        
        const file = await Files.findOne({ where: { fileNumber: fileNumber } });

        // Find all of the dates that belong to the specified fileNumber.
        const dates = await Dates.findAll({
            where: { fileNumber: fileNumber }
        })

        file.dataValues.dates = [];

        if(dates) {
            // Iterate through dates array, adding each record object to the file data sent in response.
            for(const object of dates) {
                file.dataValues.dates.push(object);
            }
        }

        customLog.successLog(`Successfully sent info for file ${fileNumber}.`);
        return res.status(200).json({ file: file });
    } catch(err) {
        customLog.errorLog('ERROR: An error occurred while trying to retrieve the File.');
        customLog.errorLog(err);
        return res.status(500).json({ message: 'The server has experienced an unexpected error.', error: err });
    }
});


// Post new File
router.post('/', async (req, res) => {
    customLog.endpointLog('Endpoint: POST /files');

    const newFile = req.body;

    if(!newFile.fileNumber) {
        customLog.errorLog('ERROR: Missing required fileNumber parameter. Aborting request.');
        return res.status(400).json({ error: 'Missing required fileNumber parameter.' });
    }

    customLog.messageLog(`Posting new file, #${newFile.fileNumber}...`);

    try {
        const existingFile = await Files.findOne({ where: {fileNumber: newFile.fileNumber }});

        if(existingFile) {
            customLog.errorLog('ERROR: A file already exists with that file number.');
            return res.status(400).json({ message: 'This file already exists.', file: existingFile});
        }

        newFile.isClosed = false;

        await sequelize.query('ALTER TABLE `critical-dates-schedule`.files AUTO_INCREMENT = 1;')
        await sequelize.query('ALTER TABLE `critical-dates-schedule`.dates AUTO_INCREMENT = 1;')

        await Files.create(newFile);

        if(newFile.effective) {        
            await Dates.create({
                date: newFile.effective,
                fileNumber: newFile.fileNumber,
                type: 'Effective',
                prefix: '',
                isClosed: true
            });
        }
        if(newFile.depositInitial) {        
            await Dates.create({
                date: newFile.depositInitial,
                fileNumber: newFile.fileNumber,
                type: 'Escrow',
                prefix: 'First ',
                isClosed: newFile.isClosedDepositInitial
            });
        }
        if(newFile.depositSecond) {        
            await Dates.create({
                date: newFile.depositSecond,
                fileNumber: newFile.fileNumber,
                type: 'Escrow',
                prefix: 'Second ',
                isClosed: newFile.isClosedDepositSecond
            });
        }
        if(newFile.loanApproval) {        
            await Dates.create({
                date: newFile.loanApproval,
                fileNumber: newFile.fileNumber,
                type: 'Loan ✓',
                prefix: '',
                isClosed: newFile.isClosedLoanApproval
            });
        }
        if(newFile.inspection) {        
            await Dates.create({
                date: newFile.inspection,
                fileNumber: newFile.fileNumber,
                type: 'Inspection',
                prefix: '',
                isClosed: newFile.isClosedInspection
            });
        }
        if(newFile.closing) {        
            await Dates.create({
                date: newFile.closing,
                fileNumber: newFile.fileNumber,
                type: 'Closing',
                prefix: '',
                isClosed: newFile.isClosedClosing
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

// Update a file
router.put('/', (req, res) => {
    customLog.endpointLog('Endpoint: PUT /files');

    const { oldFileNumber } = req.body;
    delete req.body.oldFileNumber;
    const updatedFile = req.body;

    if(!oldFileNumber) {
        customLog.errorLog('ERROR: Missing required oldFileNumber parameter. Aborting request.');
        return res.status(400).json({ error: 'Missing required oldFileNumber parameter.' });
    }

    customLog.messageLog(`Updating file ${oldFileNumber}...`);

    try {
        // update fields of File record.
        Files.update(
            updatedFile,
            { where: { fileNumber: oldFileNumber } }
        )
        .then( async () => {
            // then update the fields of each date record associated with that file
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
            } = updatedFile;

            const dates = {
                effective: { date: effective, isClosed: isClosedEffective },
                depositInitial: { date: depositInitial, isClosed: isClosedDepositInitial },
                depositSecond: { date: depositSecond, isClosed: isClosedDepositSecond },
                'Loan ✓': { date: loanApproval, isClosed: isClosedLoanApproval },
                inspection: { date: inspection, isClosed: isClosedInspection },
                closing: { date: closing, isClosed: isClosedClosing },
            }

            for(const item in dates) {
                if(!dates[item].date)
                    continue;

                const existingDate = await Dates.findOne({
                    where: {
                        fileNumber: oldFileNumber,
                        type: item.startsWith('deposit') ? 'Escrow' :  item.charAt(0).toUpperCase() + item.slice(1),
                        prefix: !item.startsWith('deposit') ? '' :
                            item.slice(7) === 'Initial' ? 'First ' : item.slice(7) + ' '
                    }
                })

                if(existingDate) {
                    await Dates.update(
                        {
                            fileNumber: updatedFile.fileNumber,
                            date: dates[item].date,
                            isClosed: dates[item].isClosed
                        },
                        {
                            where: {
                                fileNumber: oldFileNumber,
                                type: item.startsWith('deposit') ? 'Escrow' : item.charAt(0).toUpperCase() + item.slice(1),
                                prefix: !item.startsWith('deposit') ? '' :
                                    item.slice(7) === 'Initial' ? 'First ' : (item.slice(7) + ' ')

                            }
                        }
                    )
                } else {
                    await Dates.create({
                        date: dates[item].date,
                        fileNumber: updatedFile.fileNumber,
                        type: item.startsWith('deposit') ? 'Escrow' : item.charAt(0).toUpperCase() + item.slice(1),
                        prefix: !item.startsWith('deposit') ? '' :
                            item.slice(7) === 'Initial' ? 'First ' : item.slice(7) + ' ',
                        isClosed: dates[item].isClosed
                    });
                }
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

router.delete('/', async (req, res) => {
    customLog.endpointLog('Endpoint: DELETE /files');

    const { fileNumber } = req.body;

    if(!fileNumber) {
        customLog.errorLog('ERROR: Missing required fileNumber parameter; Aborting request.')
        return res.status(400).json({ error: 'Missing required fileNumber parameter.' });
    }
    
    customLog.messageLog(`Deleting file ${fileNumber}...`);

    try {

        // Find and delete File {fileNumber}.
        const file = await Files.findOne({ where: { fileNumber: fileNumber } });
        file.destroy();

        // Find and delete File's Dates.
        const fileDates = await Dates.findAll({ where: { fileNumber: fileNumber }});
        fileDates.forEach(date => date.destroy());
    
        customLog.successLog(`Successfully deleted file ${fileNumber}...`);

        return res.status(200).json({ success: `File ${fileNumber} and all associated dates have been deleted.`})
    } catch(err) {
        customLog.errorLog('ERROR: An error occurred while trying to delete the File.');
        customLog.errorLog(err);
        return res.status(500).json({ message: 'The server has experienced an unexpected error.', error: err });
    }
});

module.exports = router;
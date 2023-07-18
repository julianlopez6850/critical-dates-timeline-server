const express = require('express');
const router = express.Router();
const { Files, Dates } = require('../models');
const Sequelize = require('sequelize');
const customLog = require('../helpers/customLog');

const sequelize = new Sequelize('critical-dates-schedule', 'root', 'password', {
    host: 'localhost',
    dialect: 'mysql',
  });

// Get all Files.
// Only return attributes: ['fileNumber', 'fileRef', 'buyer', 'seller', 'address', 'isClosed'] for each File.
router.get('/all', async (req, res) => {
    customLog.endpointLog('Endpoint: GET /files/all');

    customLog.messageLog('Retrieving info for all files...');
    const files = await Files.findAll({ attributes: ['fileNumber', 'fileRef', 'buyer', 'seller', 'address', 'isClosed'] });

    customLog.successLog('Successfully sent info for all files.');
    return res.status(200).json({ files: files });
});

// Get a single File by fileNumber (required).
router.get('/', async (req, res) => {
    customLog.endpointLog('Endpoint: GET /files');

    try {
        const { fileNumber } = req.query;

        customLog.messageLog(`Retrieving info for file ${fileNumber}...`);
        
        // Find the File, include its associated Dates.
        const file = await Files.findOne({
            where: { fileNumber: fileNumber },
            include: [{ model: Dates }]
        });

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
    customLog.endpointLog('Endpoint: POST /files');

    const newFile = req.body;

    // If {fileNumber} is not provided in the request body, return and alert the user/client.
    if(!newFile.fileNumber) {
        customLog.errorLog('ERROR: Missing required fileNumber parameter. Aborting request.');
        return res.status(400).json({ error: 'Missing required fileNumber parameter.' });
    };

    customLog.messageLog(`Posting new file, #${newFile.fileNumber}...`);

    try {
        const existingFile = await Files.findOne({ where: {fileNumber: newFile.fileNumber }});

        // If the {fileNumber} provided is already in use, return and alert the user/client.
        if(existingFile) {
            customLog.errorLog('ERROR: A file already exists with that file number.');
            return res.status(400).json({ message: 'This file already exists.', file: existingFile});
        }

        // Create the new file.
        newFile.isClosed = false;
        await Files.create(newFile);

        // Create each new Date associated with the new File.
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

// Update a File.
router.put('/', async (req, res) => {
    customLog.endpointLog('Endpoint: PUT /files');

    const { oldFileNumber } = req.body;
    delete req.body.oldFileNumber;
    const updatedFile = req.body;

    // If {oldFileNumber} is not provided in the request body, return and alert the user/client.
    if(!oldFileNumber) {
        customLog.errorLog('ERROR: Missing required oldFileNumber parameter. Aborting request.');
        return res.status(400).json({ error: 'Missing required oldFileNumber parameter.' });
    }

    customLog.messageLog(`Updating file ${oldFileNumber}...`);

    const file = await Dates.findOne({ where: { fileNumber: oldFileNumber } });

    try {
        // Update the File record.
        file.update(
            updatedFile
        ).then( async () => {
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
            } = updatedFile;

            const dates = {
                effective: { date: effective, isClosed: isClosedEffective },
                depositInitial: { date: depositInitial, isClosed: isClosedDepositInitial },
                depositSecond: { date: depositSecond, isClosed: isClosedDepositSecond },
                'Loan ✓': { date: loanApproval, isClosed: isClosedLoanApproval },
                inspection: { date: inspection, isClosed: isClosedInspection },
                closing: { date: closing, isClosed: isClosedClosing },
            };

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
                });

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
                    );
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

// Delete a File.
router.delete('/', async (req, res) => {
    customLog.endpointLog('Endpoint: DELETE /files');

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
const express = require('express');
const router = express.Router();
const { Files, Dates } = require('../models');
const Sequelize = require('sequelize');

const sequelize = new Sequelize('critical-dates-schedule', 'root', 'password', {
    host: 'localhost',
    dialect: 'mysql',
  });

// Get all files.
router.get("/all", async (req, res) => {
    const files = await Files.findAll();
    res.json(files);
});

// Get single file by fileNumber.
router.get("/", async (req, res) => {
    const { fileNumber } = req.query;

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
    
    res.json(file);
});


// Post new File
router.post("/", async(req, res) => {
    try {
        const newFile = req.body;

        const existingFile = await Files.findOne({ where: {fileNumber: newFile.fileNumber }});
        
        console.log(existingFile)
        if(existingFile) {
            return res.status(400).json({ message: "This file already exists.", file: existingFile});
        }

        newFile.isClosed = false;

        console.log(newFile);

        await sequelize.query('ALTER TABLE `critical-dates-schedule`.files AUTO_INCREMENT = 1;')
        await sequelize.query('ALTER TABLE `critical-dates-schedule`.dates AUTO_INCREMENT = 1;')

        await Files.create(newFile);

        if(newFile.effective) {        
            await Dates.create({
                date: newFile.effective,
                fileNumber: newFile.fileNumber,
                type: "Effective",
                prefix: '',
                isClosed: true
            });
        }
        if(newFile.depositInitial) {        
            await Dates.create({
                date: newFile.depositInitial,
                fileNumber: newFile.fileNumber,
                type: "Escrow",
                prefix: "First ",
                isClosed: newFile.isClosedDepositInitial
            });
        }
        if(newFile.depositSecond) {        
            await Dates.create({
                date: newFile.depositSecond,
                fileNumber: newFile.fileNumber,
                type: "Escrow",
                prefix: "Second ",
                isClosed: newFile.isClosedDepositSecond
            });
        }
        if(newFile.loanApproval) {        
            await Dates.create({
                date: newFile.loanApproval,
                fileNumber: newFile.fileNumber,
                type: "Loan ✓",
                prefix: '',
                isClosed: newFile.isClosedLoanApproval
            });
        }
        if(newFile.inspection) {        
            await Dates.create({
                date: newFile.inspection,
                fileNumber: newFile.fileNumber,
                type: "Inspection",
                prefix: '',
                isClosed: newFile.isClosedInspection
            });
        }
        if(newFile.closing) {        
            await Dates.create({
                date: newFile.closing,
                fileNumber: newFile.fileNumber,
                type: "Closing",
                prefix: '',
                isClosed: newFile.isClosedClosing
            });
        }

        return res.status(200).json({ message: "Successfully added new file, and associated critical dates.", file: newFile });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ error: err });
    }

});

// Update a file
router.put("/", (req, res) => {
    const { oldFileNumber } = req.body;

    try {
        // update fields of File record.
        Files.update(
            req.body,
            { where: { fileNumber: oldFileNumber } }
        )
        .then( async () => {
            // then update the fields of each date record associated with that file
            const { effective, 
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
            } = req.body;

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
                            fileNumber: req.body.fileNumber,
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
                        fileNumber: req.body.fileNumber,
                        type: item.startsWith('deposit') ? 'Escrow' : item.charAt(0).toUpperCase() + item.slice(1),
                        prefix: !item.startsWith('deposit') ? '' :
                            item.slice(7) === 'Initial' ? 'First ' : item.slice(7) + ' ',
                        isClosed: dates[item].isClosed
                    });
                }
            }
        }).catch((err) => {
            console.log(err)
        })

        delete req.body.oldFileNumber;
    } catch {
        return res.status(400).json({ errorMessage: "Error updating file", error: err });
    }
    return res.status(200).json({ success: "File updated.", file:  req.body });
});

module.exports = router;
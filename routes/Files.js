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

        if(newFile.depositInital) {        
            await Dates.create({
                date: newFile.depositInital,
                fileNumber: newFile.fileNumber,
                type: "Escrow",
                prefix: "First ",
                isClosed: false
            });
        }
        if(newFile.depositSecond) {        
            await Dates.create({
                date: newFile.depositSecond,
                fileNumber: newFile.fileNumber,
                type: "Escrow",
                prefix: "Second ",
                isClosed: false
            });
        }
        if(newFile.depositThird) {        
            await Dates.create({
                date: newFile.depositThird,
                fileNumber: newFile.fileNumber,
                type: "Escrow",
                prefix: "Third ",
                isClosed: false
            });
        }
        if(newFile.inspection) {        
            await Dates.create({
                date: newFile.inspection,
                fileNumber: newFile.fileNumber,
                type: "Inspection",
                isClosed: false
            });
        }
        if(newFile.closing) {        
            await Dates.create({
                date: newFile.closing,
                fileNumber: newFile.fileNumber,
                type: "Closing",
                isClosed: false
            });
        }

        return res.status(200).json({ message: "Successfully added new file, and associated critical dates.", file: newFile });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ error: err });
    }

});

module.exports = router;
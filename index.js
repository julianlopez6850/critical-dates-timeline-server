const express = require('express');
const app = express();
const cors = require("cors");

app.use(express.json());
app.use(cors({
    credentials: true,
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
}));
//app.use(cookieParser());

const db = require('./models');

//Routers
const filesRouter = require("./routes/Files");
app.use("/files", filesRouter);
const datesRouter = require("./routes/Dates");
app.use("/dates", datesRouter);

db.sequelize.sync().then(() => {
    app.listen(5000, () => {
        console.log("Server running on port 5000");
    })
})


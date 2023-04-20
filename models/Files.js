module.exports = (sequelize, DataTypes) => {
    const Files = sequelize.define("Files", {
        fileNumber: { // ex.: 23001
            type: DataTypes.NUMERIC,
            allowNull: false,
        },
        depositInitial: { // ex.: YYYY-MM-DD
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        depositSecond: { // ex.: YYYY-MM-DD
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        depositThird: { // ex.: YYYY-MM-DD
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        inspection: { // ex.: YYYY-MM-DD
            type: DataTypes.DATEONLY,
            allowNull: true,
        },        
        closing: { // ex.: YYYY-MM-DD
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        address: { // ex.: "1234 N John Doe Street, Unit 123, Miami, FL 33155"
            type: DataTypes.STRING,
            allowNull: false,
        },
        buyer: { // ex.: "John Doe, a single man"
            type: DataTypes.STRING,
            allowNull: false,
        },
        seller: { // ex.: "Jane Doe, LLC, a Florida limited liability company"
            type: DataTypes.STRING,
            allowNull: false,
        },
        notes: { // ex.: "PP: $1,000,000.00, 1st Deposit: $25,000,000.00, Escrow Agent: Joan Doe Title Group"
            type: DataTypes.STRING,
            allowNull: false,
        },
        isClosed: { // 0 = closed, 1 = open
            type: DataTypes.TINYINT,
            allowNull: false,
        }
    })

    return Files;
}
module.exports = (sequelize, DataTypes) => {
    const Dates = sequelize.define("Dates", {
        date: { // ex.: YYYY-MM-DD
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        type: { // ex.: "Closing", "Escrow", "Inspection"
            type: DataTypes.STRING,
            allowNull: false,
        },
        prefix: { // ex.: "First", "Second"...
            type: DataTypes.STRING,
            allowNull: true,
        },
        fileNumber: { // ex.: 23001
            type: DataTypes.NUMERIC,
            allowNull: false,
        },
        isClosed: { // 0 = closed, 1 = open
            type: DataTypes.TINYINT,
            allowNull: false,
        }
    })

    return Dates;
}
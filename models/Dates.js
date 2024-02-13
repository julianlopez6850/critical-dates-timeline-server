module.exports = (sequelize, DataTypes) => {
    const Dates = sequelize.define("Dates", {
        date: { // ex.: YYYY-MM-DD
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        type: { // ex.: 'Effective', 'Escrow', 'Inspection', 'Closing', etc.
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
        prefix: { // ex.: 'First' or 'Second'
            type: DataTypes.STRING,
            allowNull: true,
            primaryKey: true,
        },
        fileNumber: { // ex.: 23001
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
        isClosed: { // 0 = Closed, 1 = Open
            type: DataTypes.TINYINT,
            allowNull: false,
        },
        calculatedDate: { // ex.: '{ isCalculated: 1, numDays: 3, direction: 1, from: 'Other', otherDate: 'YYYY-MM-DD' }'
            type: DataTypes.TEXT('long'),
            allowNull: true,
        },
    }, { timestamps: false });

    // Each Date belongs to one File.
    Dates.associate = (models) => {
        Dates.belongsTo(models.Files, {
            foreignKey: 'fileNumber',
            onDelete: 'cascade',
        });
    };

    return Dates;
}
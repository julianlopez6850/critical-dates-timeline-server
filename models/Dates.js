module.exports = (sequelize, DataTypes) => {
    const Dates = sequelize.define("Dates", {
        date: { // ex.: YYYY-MM-DD
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        type: { // ex.: "Closing", "Escrow", "Inspection"
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
        prefix: { // ex.: "First", "Second"...
            type: DataTypes.STRING,
            allowNull: true,
            primaryKey: true,
        },
        fileNumber: { // ex.: 23001
            type: DataTypes.NUMERIC,
            allowNull: false,
            primaryKey: true,
        },
        isClosed: { // 0 = closed, 1 = open
            type: DataTypes.TINYINT,
            allowNull: false,
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
module.exports = (sequelize, DataTypes) => {
    const Files = sequelize.define("Files", {
        fileNumber: { // ex.: 23001
            type: DataTypes.NUMERIC,
            allowNull: false,
            primaryKey: true,
        },
        fileRef: { // ex.: 'John Doe p/f Jane Doe'
            type: DataTypes.STRING,
            allowNull: false,
        },
        status: { // ex.: 'Open', 'Closed', or 'Cancelled'
            type: DataTypes.STRING,
            allowNull: false,
        },
        address: { // ex.: '1234 N John Doe Street, Unit 123, Miami, FL 33155'
            type: DataTypes.STRING,
            allowNull: false,
        },
        folioNo: { // ex.: '01-1234-56-789'
            type: DataTypes.STRING,
            allowNull: false,
        },
        buyer: { // ex.: 'John Doe, a single man'
            type: DataTypes.STRING,
            allowNull: false,
        },
        seller: { // ex.: 'Jane Doe, LLC, a Florida limited liability company'
            type: DataTypes.STRING,
            allowNull: false,
        },
        isPurchase: {// 0 = Refinance, 1 = Purchase
            type: DataTypes.TINYINT,
            allowNull: false,
        },
        whoRepresenting: {// 'Buyer', 'Seller', or 'Both'
            type: DataTypes.STRING,
            allowNull: false,
        },
        notes: { // ex.: '...'
            type: DataTypes.TEXT('long'),
            allowNull: false,
        },
        roles: { // ex.: '{ SellerDocs: 0, BuyerDocs: 0, ClosingAgent: 0, EscrowAgent: 0, TitleAgent: 0 }'
            type: DataTypes.TEXT('long'),
            allowNull: false,
        },
        milestones: { // ex.: '{ isEscrowReceived: 0, isLienRequested: 0, isTitleOrdered: 0, ... }'
            type: DataTypes.TEXT('long'),
            allowNull: false,
        },
    }, { timestamps: false });

    // Each File can have many Dates.
    Files.associate = (models) => {
        Files.hasMany(models.Dates, {
            foreignKey: 'fileNumber',
            onDelete: 'cascade',
        });
    };

    return Files;
}
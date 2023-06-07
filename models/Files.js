module.exports = (sequelize, DataTypes) => {
    const Files = sequelize.define("Files", {
        fileNumber: { // ex.: 23001
            type: DataTypes.NUMERIC,
            allowNull: false,
            primaryKey: true,
        },
        fileRef: { // ex.: "John Doe p/f Jane Doe"
            type: DataTypes.STRING,
            allowNull: false,
        },
        isClosed: { // 0 = closed, 1 = open
            type: DataTypes.TINYINT,
            allowNull: false,
        },
        address: { // ex.: "1234 N John Doe Street, Unit 123, Miami, FL 33155"
            type: DataTypes.STRING,
            allowNull: false,
        },
        folioNo: { // ex.: "01-1234-56-789"
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
        isPurchase: {// ex.: 0=REFI, 1=purchase
            type: DataTypes.TINYINT,
            allowNull: false,
        },
        whoRepresenting: {// ex.: 0=buyer, 1=seller
            type: DataTypes.TINYINT,
            allowNull: false,
        },
        notes: { // ex.: "..."
            type: DataTypes.TEXT('long'),
            allowNull: false,
        },
        roles: { // ex.: {SellerDocs:0, BuyerDocs:0, ClosingAgent:0, EscrowAgent:0, TitleAgent:0}
            type: DataTypes.TEXT('long'),
            allowNull: false,
        },
        milestones: { // ex.: {isEscrowReceived:0, isLienRequested:0, isTitleOrdered:0, ...}
            type: DataTypes.TEXT('long'),
            allowNull: false,
        },
    })

    return Files;
}
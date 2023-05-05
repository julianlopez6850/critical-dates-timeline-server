module.exports = (sequelize, DataTypes) => {
    const Files = sequelize.define("Files", {
        fileNumber: { // ex.: 23001
            type: DataTypes.NUMERIC,
            allowNull: false,
        },
        fileRef: { // ex.: "John Doe p/f Jane Doe"
            type: DataTypes.STRING,
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
        effective: { // ex.: YYYY-MM-DD
            type: DataTypes.DATEONLY,
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
        notes: { // ex.: "PP: $1,000,000.00, 1st Deposit: $25,000,000.00, Escrow Agent: Joan Doe Title Group"
            type: DataTypes.STRING,
            allowNull: false,
        },
        isClosed: { // 0 = closed, 1 = open
            type: DataTypes.TINYINT,
            allowNull: false,
        },
        isPurchase: {// ex.: 0=REFI, 1=purchase
            type: DataTypes.TINYINT,
            allowNull: false,
        },
        representing: {// ex.: 0=buyer, 1=seller
            type: DataTypes.TINYINT,
            allowNull: false,
        },
        roles: { // ex.: {SellerDocs:1, BuyerDocs:0, ClosingAgent:0, EscrowAgent:1, TitleAgent:1}
            type: DataTypes.TEXT('long'),
            allowNull: false,
        }
    })

    return Files;
}
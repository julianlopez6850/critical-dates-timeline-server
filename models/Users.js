module.exports = (sequelize, DataTypes) => {
    const Users = sequelize.define("Users", {
        username: { // ex.: "john"
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: { // ex.: "john@email.com"
            type: DataTypes.STRING,
            allowNull: false,
        },
        password: { // ex.: "password123"
            type: DataTypes.STRING,
            allowNull: false,
        },
        settings: { // ex.: "{ twoFactor: 1, notifications: 1, notificationRate: "daily", }"
            type: DataTypes.TEXT('long'),
            allowNull: false,
        },
    })

    return Users;
}
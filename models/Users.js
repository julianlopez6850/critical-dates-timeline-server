module.exports = (sequelize, DataTypes) => {
    const Users = sequelize.define("Users", {
        username: { // ex.: 'john'
            type: DataTypes.STRING,
            allowNull: false,
        },
        password: { // ex.: 'password123' (encrypted)
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: { // ex.: 'john@email.com'
            type: DataTypes.STRING,
            allowNull: false,
        },
        settings: { // ex.: '{ darkTheme: true, notifications: { Mon: { active: true, time: '08:00' }, Tue: ... }, ... }'
            type: DataTypes.TEXT('long'),
            allowNull: false,
        },
    }, { timestamps: false });

    return Users;
}
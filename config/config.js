module.exports = {
  "development": {
    "username": "root",
    "password": "password",
    "database": "critical-dates-schedule",
    "host": "localhost",
    "dialect": "mysql"
  },
  "test": {
    "username": "root",
    "password": null,
    "database": "database_test",
    "host": "127.0.0.1",
    "dialect": "mysql"
  },
  "production": {
    "username": process.env.PRODUCTION_DATABASE_USERNAME,
    "password": process.env.PRODUCTION_DATABASE_PASSWORD,
    "database": process.env.PRODUCTION_DATABASE_DATABASE,
    "host": process.env.PRODUCTION_DATABASE_HOST,
    "dialect": "mysql"
  }
}

const { leadingZero } = require('./leadingZero')

const getTodaysDate = () => {
    d = new Date();
    return `${d.getFullYear()}-${leadingZero(d.getMonth() + 1)}-${leadingZero(d.getDate())}`;
}

module.exports = { getTodaysDate };

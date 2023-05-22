const leadingZero = (num) => {
    if(num < 10)
        return '0' + num;
    return num;
}

module.exports = { leadingZero };

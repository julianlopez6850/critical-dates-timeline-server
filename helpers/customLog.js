const endpointLog = (message) => {
    return console.log('\x1b[41m%s\x1b[0m', message);   // red highlight
}

const validationLog = (message) => {
    return console.log('\n\x1b[45m%s\x1b[0m', message);   // purple highlight
}

const messageLog = (message) => {
    return console.log('\x1b[33m%s\x1b[0m', message);   // yellow text
}

const infoLog = (message) => {
    return console.log('\x1b[35m%s\x1b[0m', message);   // purple text
}

const errorLog = (message) => {
    return console.log('\x1b[31m%s\x1b[0m', message);   // red text
}

const successLog = (message) => {
    return console.log('\x1b[34m%s\x1b[0m', message);   // blue text
}

const runLog = (message) => {
    return console.log('\x1b[32m%s\x1b[0m', message);   // green text
}

module.exports = { endpointLog, messageLog, infoLog, errorLog, successLog, runLog, validationLog };
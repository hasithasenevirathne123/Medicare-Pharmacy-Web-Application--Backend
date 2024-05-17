const express = require('express');
const { createLogger, format, transports } = require("winston");

const app = express();

const logger = createLogger({
    transports: [
        new transports.File({
            filename: 'requests.log',
            level: 'info'
        })
    ],
    format: format.combine(
        format.timestamp(),
        format.json(),
        format.metadata({
            fillExcept: ['message', 'level', 'timestamp', 'stack']
        }),
        format.prettyPrint()
    )
});

function getIp(req) {
    if (req.headers['x-forwarded-for']) {
        return req.headers['x-forwarded-for'].split(',')[0].trim();
    } else if (req.socket.remoteAddress) {
        return req.socket.remoteAddress;
    } else {
        return 'Unknown Ip address';
    }
}

app.use((req, res, next) => {
    const ip = getIp(req);
    logger.info(`Request from ${ip}`, {
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body
    });
    next();
})

module.exports = logger;
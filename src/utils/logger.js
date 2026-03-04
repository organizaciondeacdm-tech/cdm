const fs = require('fs');
const path = require('path');
const util = require('util');

/**
 * Ensures the logs directory exists if we are writing files (Not Vercel)
 */
const logsDir = path.join(__dirname, '../../logs');
let dirCreated = false;

const ensureLogsDir = () => {
    if (process.env.VERCEL) return;
    if (!dirCreated && !fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
        dirCreated = true;
    }
};

/**
 * Format a log message as JSON, replicating winston.format.json()
 */
const formatJSON = (level, message, meta) => {
    const timestamp = new Date().toISOString();
    let logObj = { level, timestamp };

    // If message is an object, merge it
    if (typeof message === 'object' && message !== null) {
        logObj = { ...logObj, ...message };
    } else {
        logObj.message = message;
    }

    if (meta && Object.keys(meta).length > 0) {
        logObj = { ...logObj, ...meta };
    }

    return JSON.stringify(logObj);
};

/**
 * Format a log message for the console, replicating winston.format.simple()
 */
const formatSimple = (level, message, meta) => {
    let output = `${level}: `;
    if (typeof message === 'object') {
        output += util.inspect(message, { colors: true, depth: null });
    } else {
        output += message;
    }

    if (meta && Object.keys(meta).length > 0) {
        output += ' ' + util.inspect(meta, { colors: true, depth: null });
    }
    return output;
};

/**
 * Custom Logger Class
 */
class CustomLogger {
    constructor(options = {}) {
        this.level = options.level || 'info';
        this.transports = options.transports || [];

        // Parse simple string array transports (e.g., ['console', { type: 'file', filename: 'logs/error.log', level: 'error' }])
        // If they pass raw objects with filename, we write to files if not on Vvercel
    }

    _log(level, message, meta) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };

        // Check if level is high enough to log based on logger's configured level
        if (levels[level] < levels[this.level]) {
            return;
        }

        // Send to configured transports
        this.transports.forEach(transport => {
            // Per-transport level filter (applies to both console and file transports)
            if (transport.level && levels[level] < levels[transport.level]) {
                return;
            }
            if (transport.type === 'console') {
                const formatted = transport.format === 'json' ? formatJSON(level, message, meta) : formatSimple(level, message, meta);
                if (level === 'error') {
                    console.error(formatted);
                } else if (level === 'warn') {
                    console.warn(formatted);
                } else {
                    console.log(formatted);
                }
            } else if (transport.type === 'file' && !process.env.VERCEL) {
                ensureLogsDir();
                const logFilePath = path.isAbsolute(transport.filename) ? transport.filename : path.join(__dirname, '../../', transport.filename);
                const formatted = transport.format === 'json' ? formatJSON(level, message, meta) : formatJSON(level, message, meta); // Files default to JSON usually

                try {
                    fs.appendFileSync(logFilePath, formatted + '\n', 'utf8');
                } catch (err) {
                    console.error(`Logger Error: Failed to write to file ${logFilePath}`, err);
                }
            }
        });
    }

    info(message, meta) { this._log('info', message, meta); }
    error(message, meta) { this._log('error', message, meta); }
    warn(message, meta) { this._log('warn', message, meta); }
    debug(message, meta) { this._log('debug', message, meta); }
}

/**
 * Factory proxy to emulate winston.createLogger
 */
const createLogger = (options = {}) => {
    // Convert Winston transports to our simpler format if needed by legacy files
    // But ideally we'll refactor the call sites to pass a cleaner config array
    const parsedTransports = [];

    if (options.transports) {
        options.transports.forEach(t => {
            // Very hacky parse if they still pass winston.transports... 
            // but we'll refactor the callers so we can expect plain objects here
            parsedTransports.push(t);
        });
    }

    return new CustomLogger({
        level: options.level || 'info',
        transports: parsedTransports
    });
};

module.exports = {
    createLogger,
    formatJSON,
    formatSimple
};

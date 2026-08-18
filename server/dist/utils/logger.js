"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    static format(level, message, requestId, context) {
        const payload = {
            level,
            message,
            requestId,
            timestamp: new Date().toISOString(),
            ...(context && { context }),
        };
        return JSON.stringify(payload);
    }
    static info(message, requestId, context) {
        console.log(this.format('info', message, requestId, context));
    }
    static warn(message, requestId, context) {
        console.warn(this.format('warn', message, requestId, context));
    }
    static error(message, requestId, context) {
        console.error(this.format('error', message, requestId, context));
    }
    static debug(message, requestId, context) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(this.format('debug', message, requestId, context));
        }
    }
}
exports.Logger = Logger;

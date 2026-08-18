"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = exports.validateBody = void 0;
const zod_1 = require("zod");
const errors_1 = require("./errors");
const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const issues = error.issues ? error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') : error.message;
                return next(new errors_1.BadRequestError(`Validation error: ${issues}`));
            }
            next(error);
        }
    };
};
exports.validateBody = validateBody;
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const issues = error.issues ? error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') : error.message;
                return next(new errors_1.BadRequestError(`Validation error: ${issues}`));
            }
            next(error);
        }
    };
};
exports.validateQuery = validateQuery;

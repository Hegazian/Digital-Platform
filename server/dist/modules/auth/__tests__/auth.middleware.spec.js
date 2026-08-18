"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const auth_middleware_1 = require("../auth.middleware");
const client_1 = require("@prisma/client");
const jwtUtils = __importStar(require("../../../utils/jwt"));
(0, vitest_1.describe)('Auth Middleware Suite', () => {
    (0, vitest_1.describe)('authenticate', () => {
        (0, vitest_1.it)('should extract and verify Bearer token from header', () => {
            const mReq = {
                headers: { authorization: 'Bearer valid_token' },
            };
            const mRes = {};
            const mNext = vitest_1.vi.fn();
            vitest_1.vi.spyOn(jwtUtils, 'verifyAccessToken').mockReturnValue({ userId: 'u1', role: client_1.Role.STUDENT });
            (0, auth_middleware_1.authenticate)(mReq, mRes, mNext);
            (0, vitest_1.expect)(mReq.user).toEqual({ userId: 'u1', role: client_1.Role.STUDENT, teacherStatus: undefined });
            (0, vitest_1.expect)(mNext).toHaveBeenCalledWith();
        });
        (0, vitest_1.it)('should return error for missing authorization header', () => {
            const mReq = { headers: {} };
            const mRes = {};
            const mNext = vitest_1.vi.fn();
            (0, auth_middleware_1.authenticate)(mReq, mRes, mNext);
            (0, vitest_1.expect)(mNext).toHaveBeenCalled();
            const err = mNext.mock.calls[0][0];
            (0, vitest_1.expect)(err.statusCode).toBe(401);
        });
    });
    (0, vitest_1.describe)('requireRole', () => {
        (0, vitest_1.it)('should allow access if role matches', () => {
            const mReq = { user: { role: client_1.Role.TEACHER } };
            const mRes = {};
            const mNext = vitest_1.vi.fn();
            const guard = (0, auth_middleware_1.requireRole)([client_1.Role.TEACHER]);
            guard(mReq, mRes, mNext);
            (0, vitest_1.expect)(mNext).toHaveBeenCalledWith();
        });
        (0, vitest_1.it)('should reject access if role does not match', () => {
            const mReq = { user: { role: client_1.Role.STUDENT } };
            const mRes = {};
            const mNext = vitest_1.vi.fn();
            const guard = (0, auth_middleware_1.requireRole)([client_1.Role.TEACHER]);
            guard(mReq, mRes, mNext);
            const err = mNext.mock.calls[0][0];
            (0, vitest_1.expect)(err.statusCode).toBe(403);
        });
        (0, vitest_1.it)('should allow ADMIN role when guard requires [Role.ADMIN]', () => {
            const mReq = { user: { role: client_1.Role.ADMIN } };
            const mRes = {};
            const mNext = vitest_1.vi.fn();
            const guard = (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]);
            guard(mReq, mRes, mNext);
            (0, vitest_1.expect)(mNext).toHaveBeenCalledWith();
        });
        (0, vitest_1.it)('should reject STUDENT role when guard requires [Role.ADMIN]', () => {
            const mReq = { user: { role: client_1.Role.STUDENT } };
            const mRes = {};
            const mNext = vitest_1.vi.fn();
            const guard = (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]);
            guard(mReq, mRes, mNext);
            const err = mNext.mock.calls[0][0];
            (0, vitest_1.expect)(err.statusCode).toBe(403);
        });
    });
});

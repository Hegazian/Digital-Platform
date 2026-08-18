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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../../prisma");
const jwt_1 = require("../../utils/jwt");
const errors_1 = require("../../utils/errors");
class AuthService {
    static async register(data) {
        const { email, password, name, role } = data;
        // SECURITY: Block public registration as ADMIN.
        // Admins can only be created via seed script or by existing admins.
        const allowedRoles = [client_1.Role.STUDENT, client_1.Role.TEACHER];
        const sanitizedRole = role && allowedRoles.includes(role) ? role : client_1.Role.STUDENT;
        if (role === client_1.Role.ADMIN) {
            throw new errors_1.ForbiddenError('Admin accounts cannot be created through public registration');
        }
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new errors_1.ConflictError('User with this email already exists');
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const teacherStatus = sanitizedRole === client_1.Role.TEACHER ? client_1.TeacherStatus.PENDING : null;
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: sanitizedRole,
                teacherStatus,
                isActive: true,
            },
        });
        // Send welcome notification email (non-blocking)
        try {
            const { sendWelcomeEmail } = await Promise.resolve().then(() => __importStar(require('../../utils/email')));
            sendWelcomeEmail(user.email, user.name).catch((err) => console.warn('Welcome email error:', err));
        }
        catch (e) {
            // Ignore background email import errors
        }
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            teacherStatus: user.teacherStatus,
        };
    }
    static async login(data) {
        const { email, password } = data;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new errors_1.UnauthorizedError('Invalid credentials');
        }
        if (!user.isActive) {
            throw new errors_1.UnauthorizedError('Account is deactivated or unverified');
        }
        if (user.role === client_1.Role.TEACHER && user.teacherStatus === client_1.TeacherStatus.PENDING) {
            throw new errors_1.UnauthorizedError('Teacher account is pending approval');
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            throw new errors_1.UnauthorizedError('Invalid credentials');
        }
        // Enterprise MFA Check
        if (user.mfaEnabled && user.mfaSecret) {
            if (data.mfaCode) {
                const { verifySync } = await Promise.resolve().then(() => __importStar(require('otplib')));
                const verification = verifySync({ token: data.mfaCode, secret: user.mfaSecret });
                if (!verification.valid) {
                    throw new errors_1.UnauthorizedError('Invalid MFA authentication code');
                }
            }
            else {
                const { generateAccessToken } = await Promise.resolve().then(() => __importStar(require('../../utils/jwt')));
                const mfaSessionToken = generateAccessToken({ userId: user.id, purpose: 'mfa_challenge' });
                return {
                    mfaRequired: true,
                    mfaSessionToken,
                    message: 'MFA authentication code required',
                };
            }
        }
        const payload = { userId: user.id, role: user.role, teacherStatus: user.teacherStatus };
        const accessToken = (0, jwt_1.generateAccessToken)(payload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                mfaEnabled: user.mfaEnabled,
            },
            tokens: {
                accessToken,
                refreshToken,
            },
        };
    }
    static async verifyMfaLogin(data) {
        const { mfaSessionToken, mfaCode } = data;
        if (!mfaSessionToken || !mfaCode) {
            throw new errors_1.BadRequestError('mfaSessionToken and mfaCode are required');
        }
        let decoded;
        try {
            const { verifyAccessToken } = await Promise.resolve().then(() => __importStar(require('../../utils/jwt')));
            decoded = verifyAccessToken(mfaSessionToken);
        }
        catch (err) {
            throw new errors_1.UnauthorizedError('Invalid or expired MFA session token');
        }
        if (decoded.purpose !== 'mfa_challenge') {
            throw new errors_1.UnauthorizedError('Invalid MFA challenge token purpose');
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user || !user.isActive || !user.mfaSecret) {
            throw new errors_1.UnauthorizedError('Invalid user account or MFA not configured');
        }
        const { verifySync } = await Promise.resolve().then(() => __importStar(require('otplib')));
        const verification = verifySync({ token: mfaCode, secret: user.mfaSecret });
        if (!verification.valid) {
            throw new errors_1.UnauthorizedError('Invalid MFA authentication code');
        }
        const payload = { userId: user.id, role: user.role, teacherStatus: user.teacherStatus };
        const accessToken = (0, jwt_1.generateAccessToken)(payload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                mfaEnabled: user.mfaEnabled,
            },
            tokens: {
                accessToken,
                refreshToken,
            },
        };
    }
    static async refreshToken(token) {
        if (!token) {
            throw new errors_1.BadRequestError('Refresh token is required');
        }
        try {
            const { verifyRefreshToken } = await Promise.resolve().then(() => __importStar(require('../../utils/jwt')));
            const decoded = verifyRefreshToken(token);
            const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.userId } });
            if (!user || !user.isActive) {
                throw new errors_1.UnauthorizedError('User account is invalid or deactivated');
            }
            const payload = { userId: user.id, role: user.role, teacherStatus: user.teacherStatus };
            const newAccessToken = (0, jwt_1.generateAccessToken)(payload);
            const newRefreshToken = (0, jwt_1.generateRefreshToken)(payload);
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            };
        }
        catch (err) {
            throw new errors_1.UnauthorizedError('Invalid or expired refresh token');
        }
    }
}
exports.AuthService = AuthService;

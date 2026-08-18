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
const vitest_1 = require("vitest");
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../../../prisma");
const auth_service_1 = require("../auth.service");
vitest_1.vi.mock('../../../prisma', () => ({
    prisma: {
        user: {
            findUnique: vitest_1.vi.fn(),
            create: vitest_1.vi.fn(),
        },
    },
}));
(0, vitest_1.describe)('AuthService Unit Tests', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('Registration Logic', () => {
        (0, vitest_1.it)('should hash password and create student user', async () => {
            vitest_1.vi.spyOn(bcrypt_1.default, 'hash').mockImplementation(async () => 'hashed_password');
            prisma_1.prisma.user.findUnique.mockResolvedValue(null);
            prisma_1.prisma.user.create.mockResolvedValue({
                id: 'user-1',
                email: 'student@test.com',
                name: 'Student Name',
                role: client_1.Role.STUDENT,
                teacherStatus: null,
            });
            const res = await auth_service_1.AuthService.register({
                email: 'student@test.com',
                password: 'Password123',
                name: 'Student Name',
                role: client_1.Role.STUDENT,
            });
            (0, vitest_1.expect)(res.email).toBe('student@test.com');
            (0, vitest_1.expect)(res.role).toBe(client_1.Role.STUDENT);
        });
        (0, vitest_1.it)('should throw ForbiddenError when registering with role=ADMIN', async () => {
            await (0, vitest_1.expect)(auth_service_1.AuthService.register({
                email: 'admin@test.com',
                password: 'Password123!',
                name: 'Admin Name',
                role: client_1.Role.ADMIN,
            })).rejects.toThrow('Admin accounts cannot be created through public registration');
        });
    });
    (0, vitest_1.describe)('Login Logic', () => {
        (0, vitest_1.it)('should throw UnauthorizedError for wrong password', async () => {
            vitest_1.vi.spyOn(bcrypt_1.default, 'compare').mockImplementation(async () => false);
            prisma_1.prisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: 'user@test.com',
                password: 'hashed_password',
                isActive: true,
                role: client_1.Role.STUDENT,
            });
            await (0, vitest_1.expect)(auth_service_1.AuthService.login({ email: 'user@test.com', password: 'wrongpassword' })).rejects.toThrow('Invalid credentials');
        });
        (0, vitest_1.it)('should throw UnauthorizedError for deactivated account', async () => {
            prisma_1.prisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: 'user@test.com',
                password: 'hashed_password',
                isActive: false,
                role: client_1.Role.STUDENT,
            });
            await (0, vitest_1.expect)(auth_service_1.AuthService.login({ email: 'user@test.com', password: 'Password123!' })).rejects.toThrow('Account is deactivated or unverified');
        });
        (0, vitest_1.it)('should throw UnauthorizedError for pending teacher account', async () => {
            prisma_1.prisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: 'teacher@test.com',
                password: 'hashed_password',
                isActive: true,
                role: client_1.Role.TEACHER,
                teacherStatus: 'PENDING',
            });
            await (0, vitest_1.expect)(auth_service_1.AuthService.login({ email: 'teacher@test.com', password: 'Password123!' })).rejects.toThrow('Teacher account is pending approval');
        });
    });
    (0, vitest_1.describe)('refreshToken Logic', () => {
        (0, vitest_1.it)('should throw BadRequestError if token is missing', async () => {
            await (0, vitest_1.expect)(auth_service_1.AuthService.refreshToken('')).rejects.toThrow('Refresh token is required');
        });
        (0, vitest_1.it)('should return new tokens for a valid refresh token', async () => {
            const { generateRefreshToken } = await Promise.resolve().then(() => __importStar(require('../../../utils/jwt')));
            const sampleRefreshToken = generateRefreshToken({ userId: 'user-1', role: client_1.Role.STUDENT });
            prisma_1.prisma.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: 'student@test.com',
                name: 'Student Name',
                role: client_1.Role.STUDENT,
                isActive: true,
            });
            const res = await auth_service_1.AuthService.refreshToken(sampleRefreshToken);
            (0, vitest_1.expect)(res.accessToken).toBeDefined();
            (0, vitest_1.expect)(res.refreshToken).toBeDefined();
        });
        (0, vitest_1.it)('should throw UnauthorizedError for invalid token', async () => {
            await (0, vitest_1.expect)(auth_service_1.AuthService.refreshToken('invalid_token')).rejects.toThrow('Invalid or expired refresh token');
        });
    });
});

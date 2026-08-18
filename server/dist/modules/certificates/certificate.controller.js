"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCertificate = exports.issueCertificate = void 0;
const prisma_1 = require("../../prisma");
const crypto_1 = __importDefault(require("crypto"));
const issueCertificate = async (req, res) => {
    const { courseId } = req.body;
    const userId = req.user?.userId;
    if (!courseId) {
        return res.status(400).json({ success: false, message: 'courseId is required' });
    }
    const certificateCode = `EDU-CERT-${crypto_1.default.randomBytes(4).toString('hex').toUpperCase()}`;
    const cert = await prisma_1.prisma.certificate.create({
        data: {
            userId: userId || 'anonymous',
            courseId,
            certificateCode,
            pdfUrl: `/api/v1/certificates/download/${certificateCode}`,
        },
    });
    return res.status(201).json({ success: true, data: cert });
};
exports.issueCertificate = issueCertificate;
const verifyCertificate = async (req, res) => {
    const code = req.params.code;
    const cert = await prisma_1.prisma.certificate.findUnique({
        where: { certificateCode: code },
    });
    if (!cert) {
        return res.status(404).json({ success: false, message: 'Certificate code not found or invalid' });
    }
    return res.status(200).json({ success: true, data: cert });
};
exports.verifyCertificate = verifyCertificate;

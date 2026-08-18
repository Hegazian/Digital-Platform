import { Request, Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { prisma } from '../../prisma';
import crypto from 'crypto';

export const issueCertificate = async (req: AuthRequest, res: Response) => {
  const { courseId } = req.body;
  const userId = req.user?.userId;

  if (!courseId) {
    return res.status(400).json({ success: false, message: 'courseId is required' });
  }

  const certificateCode = `EDU-CERT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const cert = await prisma.certificate.create({
    data: {
      userId: userId || 'anonymous',
      courseId,
      certificateCode,
      pdfUrl: `/api/v1/certificates/download/${certificateCode}`,
    },
  });

  return res.status(201).json({ success: true, data: cert });
};

export const verifyCertificate = async (req: Request, res: Response) => {
  const code = req.params.code as string;

  const cert = await prisma.certificate.findUnique({
    where: { certificateCode: code },
  });

  if (!cert) {
    return res.status(404).json({ success: false, message: 'Certificate code not found or invalid' });
  }

  return res.status(200).json({ success: true, data: cert });
};

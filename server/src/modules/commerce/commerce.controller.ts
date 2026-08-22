import { Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { CommerceService } from './commerce.service';
import { EntitlementType } from '@prisma/client';
import { UnauthorizedError } from '../../utils/errors';
import { verifyPaymobSignature, verifyFawrySignature } from '../../utils/webhook-security';

export class CommerceController {
  // Products
  static async createProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const product = await CommerceService.createProduct(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  static async getAllProducts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const products = await CommerceService.getAllProducts();
      res.status(200).json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  }

  // Orders
  static async createOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const order = await CommerceService.createOrder(studentId, req.body);
      res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  // Webhooks (Cryptographically Verified)
  static async processPaymobWebhook(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const hmac = (req.headers['x-paymob-hmac'] || req.headers['hmac'] || req.query.hmac) as string;
      const isValid = verifyPaymobSignature(req.body, hmac);

      if (!isValid) {
        throw new UnauthorizedError('Invalid or missing Paymob HMAC signature');
      }

      const result = await CommerceService.processPaymobWebhook(req.body);
      res.status(200).json({ success: true, data: result.order, message: result.message });
    } catch (err) {
      next(err);
    }
  }

  static async processFawryWebhook(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const signature = (req.headers['x-fawry-signature'] || req.body.signature) as string;
      const isValid = verifyFawrySignature({ ...req.body, signature });

      if (!isValid) {
        throw new UnauthorizedError('Invalid or missing Fawry signature');
      }

      const result = await CommerceService.processPaymobWebhook(req.body);
      res.status(200).json({ success: true, data: result.order, message: result.message });
    } catch (err) {
      next(err);
    }
  }

  // Entitlements
  static async checkEntitlementAccess(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const resourceType = req.query.resourceType as EntitlementType;
      const resourceId = req.query.resourceId as string;

      const result = await CommerceService.checkEntitlementAccess(studentId, resourceType, resourceId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async checkCourseAccess(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const courseId = req.params.courseId as string;

      const result = await CommerceService.checkCourseAccess(studentId, courseId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // Vouchers
  static async getAllVouchers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const vouchers = await CommerceService.getAllVouchers();
      res.status(200).json({ success: true, data: vouchers });
    } catch (err) {
      next(err);
    }
  }

  static async createVoucher(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const voucher = await CommerceService.createVoucher(req.body);
      res.status(201).json({ success: true, data: voucher });
    } catch (err) {
      next(err);
    }
  }

  static async deleteVoucher(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await CommerceService.deleteVoucher(req.params.id as string);
      res.status(200).json({ success: true, message: 'Voucher deactivated successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async redeemVoucher(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const { code } = req.body;
      const entitlement = await CommerceService.redeemVoucher(studentId, code);
      res.status(200).json({ success: true, data: entitlement });
    } catch (err) {
      next(err);
    }
  }
}

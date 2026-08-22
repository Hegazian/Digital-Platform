import { Router } from 'express';
import { CommerceController } from './commerce.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const commerceRouter = Router();

// Public Product Catalog Listing
commerceRouter.get('/products', CommerceController.getAllProducts);

// Admin Product & Voucher Management
commerceRouter.post(
  '/products',
  authenticate,
  requireRole([Role.ADMIN]),
  CommerceController.createProduct
);

commerceRouter.get(
  '/vouchers',
  authenticate,
  requireRole([Role.ADMIN]),
  CommerceController.getAllVouchers
);

commerceRouter.post(
  '/vouchers',
  authenticate,
  requireRole([Role.ADMIN]),
  CommerceController.createVoucher
);

commerceRouter.delete(
  '/vouchers/:id',
  authenticate,
  requireRole([Role.ADMIN]),
  CommerceController.deleteVoucher
);

// Student Checkout & Voucher Redemption (Strictly for Students)
commerceRouter.post(
  '/orders',
  authenticate,
  requireRole([Role.STUDENT], false),
  CommerceController.createOrder
);

commerceRouter.post(
  '/vouchers/redeem',
  authenticate,
  requireRole([Role.STUDENT], false),
  CommerceController.redeemVoucher
);

// Student Entitlement Access Verification (Course & Subject)
commerceRouter.get(
  '/entitlements/check',
  authenticate,
  CommerceController.checkEntitlementAccess
);

commerceRouter.get(
  '/entitlements/check-course/:courseId',
  authenticate,
  CommerceController.checkCourseAccess
);

// Automated Webhook Callbacks (Paymob & Fawry)
commerceRouter.post('/webhooks/paymob', CommerceController.processPaymobWebhook);
commerceRouter.post('/webhooks/fawry', CommerceController.processFawryWebhook);

export default commerceRouter;

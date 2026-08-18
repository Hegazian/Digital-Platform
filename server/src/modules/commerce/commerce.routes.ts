import { Router } from 'express';
import { CommerceController } from './commerce.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const commerceRouter = Router();

// Public Product Catalog Listing
commerceRouter.get('/products', CommerceController.getAllProducts);

// Admin Product & Voucher Creation
commerceRouter.post(
  '/products',
  authenticate,
  requireRole([Role.ADMIN]),
  CommerceController.createProduct
);

commerceRouter.post(
  '/vouchers',
  authenticate,
  requireRole([Role.ADMIN]),
  CommerceController.createVoucher
);

// Student Checkout & Voucher Redemption
commerceRouter.post(
  '/orders',
  authenticate,
  requireRole([Role.STUDENT]),
  CommerceController.createOrder
);

commerceRouter.post(
  '/vouchers/redeem',
  authenticate,
  requireRole([Role.STUDENT]),
  CommerceController.redeemVoucher
);

// Student Entitlement Access Verification
commerceRouter.get(
  '/entitlements/check',
  authenticate,
  CommerceController.checkEntitlementAccess
);

// Automated Webhook Callbacks (Paymob & Fawry)
commerceRouter.post('/webhooks/paymob', CommerceController.processPaymobWebhook);
commerceRouter.post('/webhooks/fawry', CommerceController.processFawryWebhook);

export default commerceRouter;

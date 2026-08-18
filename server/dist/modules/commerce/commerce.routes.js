"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const commerce_controller_1 = require("./commerce.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const client_1 = require("@prisma/client");
const commerceRouter = (0, express_1.Router)();
// Public Product Catalog Listing
commerceRouter.get('/products', commerce_controller_1.CommerceController.getAllProducts);
// Admin Product & Voucher Creation
commerceRouter.post('/products', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), commerce_controller_1.CommerceController.createProduct);
commerceRouter.post('/vouchers', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), commerce_controller_1.CommerceController.createVoucher);
// Student Checkout & Voucher Redemption
commerceRouter.post('/orders', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.STUDENT]), commerce_controller_1.CommerceController.createOrder);
commerceRouter.post('/vouchers/redeem', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.STUDENT]), commerce_controller_1.CommerceController.redeemVoucher);
// Student Entitlement Access Verification
commerceRouter.get('/entitlements/check', auth_middleware_1.authenticate, commerce_controller_1.CommerceController.checkEntitlementAccess);
// Automated Webhook Callbacks (Paymob & Fawry)
commerceRouter.post('/webhooks/paymob', commerce_controller_1.CommerceController.processPaymobWebhook);
commerceRouter.post('/webhooks/fawry', commerce_controller_1.CommerceController.processFawryWebhook);
exports.default = commerceRouter;

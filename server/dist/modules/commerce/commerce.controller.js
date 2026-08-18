"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommerceController = void 0;
const commerce_service_1 = require("./commerce.service");
const errors_1 = require("../../utils/errors");
const webhook_security_1 = require("../../utils/webhook-security");
class CommerceController {
    // Products
    static async createProduct(req, res, next) {
        try {
            const product = await commerce_service_1.CommerceService.createProduct(req.body);
            res.status(201).json({ success: true, data: product });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAllProducts(req, res, next) {
        try {
            const products = await commerce_service_1.CommerceService.getAllProducts();
            res.status(200).json({ success: true, data: products });
        }
        catch (err) {
            next(err);
        }
    }
    // Orders
    static async createOrder(req, res, next) {
        try {
            const studentId = req.user.userId;
            const order = await commerce_service_1.CommerceService.createOrder(studentId, req.body);
            res.status(201).json({ success: true, data: order });
        }
        catch (err) {
            next(err);
        }
    }
    // Webhooks (Cryptographically Verified)
    static async processPaymobWebhook(req, res, next) {
        try {
            const hmac = (req.headers['x-paymob-hmac'] || req.headers['hmac'] || req.query.hmac);
            const isValid = (0, webhook_security_1.verifyPaymobSignature)(req.body, hmac);
            if (!isValid) {
                throw new errors_1.UnauthorizedError('Invalid or missing Paymob HMAC signature');
            }
            const result = await commerce_service_1.CommerceService.processPaymobWebhook(req.body);
            res.status(200).json({ success: true, data: result.order, message: result.message });
        }
        catch (err) {
            next(err);
        }
    }
    static async processFawryWebhook(req, res, next) {
        try {
            const signature = (req.headers['x-fawry-signature'] || req.body.signature);
            const isValid = (0, webhook_security_1.verifyFawrySignature)({ ...req.body, signature });
            if (!isValid) {
                throw new errors_1.UnauthorizedError('Invalid or missing Fawry signature');
            }
            const result = await commerce_service_1.CommerceService.processPaymobWebhook(req.body);
            res.status(200).json({ success: true, data: result.order, message: result.message });
        }
        catch (err) {
            next(err);
        }
    }
    // Entitlements
    static async checkEntitlementAccess(req, res, next) {
        try {
            const studentId = req.user.userId;
            const resourceType = req.query.resourceType;
            const resourceId = req.query.resourceId;
            const result = await commerce_service_1.CommerceService.checkEntitlementAccess(studentId, resourceType, resourceId);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    // Vouchers
    static async createVoucher(req, res, next) {
        try {
            const voucher = await commerce_service_1.CommerceService.createVoucher(req.body);
            res.status(201).json({ success: true, data: voucher });
        }
        catch (err) {
            next(err);
        }
    }
    static async redeemVoucher(req, res, next) {
        try {
            const studentId = req.user.userId;
            const { code } = req.body;
            const entitlement = await commerce_service_1.CommerceService.redeemVoucher(studentId, code);
            res.status(200).json({ success: true, data: entitlement });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.CommerceController = CommerceController;

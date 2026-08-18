"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommerceService = void 0;
const prisma_1 = require("../../prisma");
const errors_1 = require("../../utils/errors");
const client_1 = require("@prisma/client");
class CommerceService {
    // Products
    static async createProduct(data) {
        return await prisma_1.prisma.product.create({
            data: {
                nameEn: data.nameEn,
                nameAr: data.nameAr,
                description: data.description,
                productType: data.productType,
                resourceId: data.resourceId,
                priceEgp: data.priceEgp,
                priceUsd: data.priceUsd,
            },
        });
    }
    static async getAllProducts() {
        return await prisma_1.prisma.product.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    // Orders
    static async createOrder(studentId, data) {
        // Check existing order with idempotencyKey
        const existingOrder = await prisma_1.prisma.order.findUnique({
            where: { idempotencyKey: data.idempotencyKey },
        });
        if (existingOrder) {
            return existingOrder;
        }
        const product = await prisma_1.prisma.product.findUnique({
            where: { id: data.productId },
        });
        if (!product || !product.isActive) {
            throw new errors_1.NotFoundError('Product not found or inactive');
        }
        return await prisma_1.prisma.order.create({
            data: {
                student: { connect: { id: studentId } },
                product: { connect: { id: data.productId } },
                status: client_1.OrderStatus.PENDING,
                totalAmountEgp: product.priceEgp,
                totalAmountUsd: product.priceUsd,
                paymentMethod: data.paymentMethod,
                idempotencyKey: data.idempotencyKey,
            },
            include: {
                product: true,
            },
        });
    }
    // Webhook Reconciliation (Paymob & Fawry Idempotent Processing)
    static async processPaymobWebhook(data) {
        const order = await prisma_1.prisma.order.findUnique({
            where: { id: data.orderId },
            include: { product: true },
        });
        if (!order) {
            throw new errors_1.NotFoundError('Order not found');
        }
        if (order.status === client_1.OrderStatus.PAID) {
            return { message: 'Order already processed', status: order.status, order };
        }
        if (!data.success) {
            const failedOrder = await prisma_1.prisma.order.update({
                where: { id: data.orderId },
                data: { status: client_1.OrderStatus.FAILED, transactionRef: data.transactionRef },
            });
            return { message: 'Order payment failed', status: client_1.OrderStatus.FAILED, order: failedOrder };
        }
        return await prisma_1.prisma.$transaction(async (tx) => {
            // Update order status to PAID
            const paidOrder = await tx.order.update({
                where: { id: data.orderId },
                data: { status: client_1.OrderStatus.PAID, transactionRef: data.transactionRef },
            });
            // Grant Entitlement inside the exact same atomic transaction
            if (order.product.resourceId) {
                const startsAt = new Date();
                const expiresAt = new Date(startsAt.getTime() + 180 * 24 * 60 * 60 * 1000);
                await tx.entitlement.create({
                    data: {
                        student: { connect: { id: order.studentId } },
                        order: { connect: { id: order.id } },
                        resourceType: order.product.productType,
                        resourceId: order.product.resourceId,
                        sourceType: client_1.EntitlementSource.PURCHASE,
                        startsAt,
                        expiresAt,
                        status: client_1.EntitlementStatus.ACTIVE,
                    },
                });
            }
            return { message: 'Payment successfully reconciled', status: client_1.OrderStatus.PAID, order: paidOrder };
        }, { timeout: 20000, maxWait: 15000 });
    }
    // Entitlements
    static async grantEntitlement(data) {
        const startsAt = new Date();
        const expiresAt = data.durationDays
            ? new Date(startsAt.getTime() + data.durationDays * 24 * 60 * 60 * 1000)
            : null;
        return await prisma_1.prisma.entitlement.create({
            data: {
                student: { connect: { id: data.studentId } },
                ...(data.orderId && { order: { connect: { id: data.orderId } } }),
                resourceType: data.resourceType,
                resourceId: data.resourceId,
                sourceType: data.sourceType ?? client_1.EntitlementSource.PURCHASE,
                startsAt,
                expiresAt,
                status: client_1.EntitlementStatus.ACTIVE,
            },
        });
    }
    static async checkEntitlementAccess(studentId, resourceType, resourceId) {
        const entitlement = await prisma_1.prisma.entitlement.findFirst({
            where: {
                studentId,
                resourceType,
                resourceId,
                status: client_1.EntitlementStatus.ACTIVE,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gte: new Date() } },
                ],
            },
        });
        return { hasAccess: Boolean(entitlement), entitlement };
    }
    // Vouchers
    static async createVoucher(data) {
        const existing = await prisma_1.prisma.voucher.findUnique({
            where: { code: data.code },
        });
        if (existing) {
            throw new errors_1.ConflictError(`Voucher code '${data.code}' already exists`);
        }
        return await prisma_1.prisma.voucher.create({
            data: {
                code: data.code,
                resourceType: data.resourceType,
                resourceId: data.resourceId,
                durationDays: data.durationDays ?? 30,
                maxUses: data.maxUses ?? 1,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            },
        });
    }
    static async redeemVoucher(studentId, code) {
        const voucher = await prisma_1.prisma.voucher.findUnique({
            where: { code },
        });
        if (!voucher || !voucher.isActive) {
            throw new errors_1.NotFoundError('Invalid or expired voucher code');
        }
        const now = new Date();
        if (voucher.expiresAt && voucher.expiresAt < now) {
            throw new errors_1.BadRequestError('Voucher code has expired');
        }
        // Atomic conditional increment inside a transaction
        return await prisma_1.prisma.$transaction(async (tx) => {
            const updateResult = await tx.voucher.updateMany({
                where: {
                    id: voucher.id,
                    isActive: true,
                    usedCount: { lt: voucher.maxUses },
                    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
                data: {
                    usedCount: { increment: 1 },
                },
            });
            if (updateResult.count === 0) {
                throw new errors_1.BadRequestError('Voucher code has reached maximum usage limit');
            }
            // Grant Entitlement inside the exact same atomic transaction
            const startsAt = new Date();
            const expiresAt = voucher.durationDays
                ? new Date(startsAt.getTime() + voucher.durationDays * 24 * 60 * 60 * 1000)
                : null;
            return await tx.entitlement.create({
                data: {
                    student: { connect: { id: studentId } },
                    resourceType: voucher.resourceType,
                    resourceId: voucher.resourceId,
                    sourceType: client_1.EntitlementSource.VOUCHER,
                    startsAt,
                    expiresAt,
                    status: client_1.EntitlementStatus.ACTIVE,
                },
            });
        });
    }
}
exports.CommerceService = CommerceService;

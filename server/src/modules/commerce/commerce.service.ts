import { prisma } from '../../prisma';
import { NotFoundError, BadRequestError, ConflictError } from '../../utils/errors';
import {
  ProductType,
  OrderStatus,
  PaymentMethod,
  EntitlementType,
  EntitlementSource,
  EntitlementStatus,
} from '@prisma/client';

export class CommerceService {
  // Products
  static async createProduct(data: {
    nameEn: string;
    nameAr: string;
    description?: string;
    productType: ProductType;
    resourceId?: string;
    priceEgp: number;
    priceUsd: number;
  }) {
    return await prisma.product.create({
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
    return await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Orders
  static async createOrder(
    studentId: string,
    data: {
      productId: string;
      paymentMethod: PaymentMethod;
      idempotencyKey: string;
    }
  ) {
    // Check existing order with idempotencyKey
    const existingOrder = await prisma.order.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
    });
    if (existingOrder) {
      return existingOrder;
    }

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });
    if (!product || !product.isActive) {
      throw new NotFoundError('Product not found or inactive');
    }

    return await prisma.order.create({
      data: {
        student: { connect: { id: studentId } },
        product: { connect: { id: data.productId } },
        status: OrderStatus.PENDING,
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
  static async processPaymobWebhook(data: {
    orderId: string;
    transactionRef: string;
    success: boolean;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { product: true },
    });
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.status === OrderStatus.PAID) {
      return { message: 'Order already processed', status: order.status, order };
    }

    if (!data.success) {
      const failedOrder = await prisma.order.update({
        where: { id: data.orderId },
        data: { status: OrderStatus.FAILED, transactionRef: data.transactionRef },
      });
      return { message: 'Order payment failed', status: OrderStatus.FAILED, order: failedOrder };
    }

    return await prisma.$transaction(
      async (tx) => {
        // Update order status to PAID
        const paidOrder = await tx.order.update({
          where: { id: data.orderId },
          data: { status: OrderStatus.PAID, transactionRef: data.transactionRef },
        });

        // Grant Entitlement inside the exact same atomic transaction
        if (order.product.resourceId) {
          const startsAt = new Date();
          const expiresAt = new Date(startsAt.getTime() + 180 * 24 * 60 * 60 * 1000);

          await tx.entitlement.create({
            data: {
              student: { connect: { id: order.studentId } },
              order: { connect: { id: order.id } },
              resourceType: order.product.productType as unknown as EntitlementType,
              resourceId: order.product.resourceId,
              sourceType: EntitlementSource.PURCHASE,
              startsAt,
              expiresAt,
              status: EntitlementStatus.ACTIVE,
            },
          });
        }

        return { message: 'Payment successfully reconciled', status: OrderStatus.PAID, order: paidOrder };
      },
      { timeout: 20000, maxWait: 15000 }
    );
  }

  // Entitlements
  static async grantEntitlement(data: {
    studentId: string;
    orderId?: string;
    resourceType: EntitlementType;
    resourceId: string;
    sourceType?: EntitlementSource;
    durationDays?: number;
  }) {
    const startsAt = new Date();
    const expiresAt = data.durationDays
      ? new Date(startsAt.getTime() + data.durationDays * 24 * 60 * 60 * 1000)
      : null;

    return await prisma.entitlement.create({
      data: {
        student: { connect: { id: data.studentId } },
        ...(data.orderId && { order: { connect: { id: data.orderId } } }),
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        sourceType: data.sourceType ?? EntitlementSource.PURCHASE,
        startsAt,
        expiresAt,
        status: EntitlementStatus.ACTIVE,
      },
    });
  }

  static async checkEntitlementAccess(
    studentId: string,
    resourceType: EntitlementType,
    resourceId: string
  ) {
    const entitlement = await prisma.entitlement.findFirst({
      where: {
        studentId,
        resourceType,
        resourceId,
        status: EntitlementStatus.ACTIVE,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
    });

    return { hasAccess: Boolean(entitlement), entitlement };
  }

  // Vouchers
  static async createVoucher(data: {
    code: string;
    resourceType: EntitlementType;
    resourceId: string;
    durationDays?: number;
    maxUses?: number;
    expiresAt?: string | Date;
  }) {
    const existing = await prisma.voucher.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new ConflictError(`Voucher code '${data.code}' already exists`);
    }

    return await prisma.voucher.create({
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

  static async redeemVoucher(studentId: string, code: string) {
    const voucher = await prisma.voucher.findUnique({
      where: { code },
    });

    if (!voucher || !voucher.isActive) {
      throw new NotFoundError('Invalid or expired voucher code');
    }

    const now = new Date();
    if (voucher.expiresAt && voucher.expiresAt < now) {
      throw new BadRequestError('Voucher code has expired');
    }

    // Atomic conditional increment inside a transaction
    return await prisma.$transaction(async (tx) => {
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
        throw new BadRequestError('Voucher code has reached maximum usage limit');
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
          sourceType: EntitlementSource.VOUCHER,
          startsAt,
          expiresAt,
          status: EntitlementStatus.ACTIVE,
        },
      });
    });
  }
}

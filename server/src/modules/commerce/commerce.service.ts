import { prisma } from '../../prisma';
import { NotFoundError, BadRequestError, ConflictError } from '../../utils/errors';
import { logAuditAction } from '../audit/audit.service';
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
      transactionRef?: string;
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

    // Zero-priced products are not purchasable - the course is either free
    // (open enrollment) or misconfigured. Point students at enroll instead.
    if (Number(product.priceEgp) <= 0) {
      throw new BadRequestError('This product is free or unavailable for purchase');
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
        ...(data.transactionRef && { transactionRef: data.transactionRef }),
      },
      include: {
        product: true,
      },
    });
  }

  /** Student's own order history (purchase tracking / status polling). */
  static async getMyOrders(studentId: string) {
    return prisma.order.findMany({
      where: { studentId },
      include: {
        product: {
          select: { id: true, nameEn: true, nameAr: true, productType: true, resourceId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Admin queue of orders pending manual payment reconciliation. */
  static async adminListOrders(status?: OrderStatus) {
    return prisma.order.findMany({
      where: status ? { status } : undefined,
      include: {
        product: { select: { id: true, nameEn: true, nameAr: true, priceEgp: true } },
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Admin confirms an offline payment (Vodafone Cash/InstaPay receipt verified). */
  static async adminApproveOrder(orderId: string, adminId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    if (order.status === OrderStatus.PAID) {
      return { message: 'Order already processed', status: order.status, order };
    }
    if (order.paymentMethod === PaymentMethod.VOUCHER) {
      throw new BadRequestError('Voucher-based orders are fulfilled by redeeming the voucher code');
    }

    const result = await this.fulfillOrder(
      orderId,
      order.status,
      order.transactionRef || `ADMIN-APPROVED-${adminId}`,
      true
    );

    await logAuditAction(adminId, 'ORDER_APPROVED', orderId, 'Order', {
      studentId: order.studentId,
      amountEgp: Number(order.totalAmountEgp),
    });

    return result;
  }

  /** Admin rejects a manual payment (invalid/missing transaction proof). */
  static async adminRejectOrder(orderId: string, adminId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    if (order.status === OrderStatus.PAID) {
      throw new ConflictError('Cannot reject an already-paid order - issue a refund instead');
    }

    const failed = await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.FAILED },
    });

    await logAuditAction(adminId, 'ORDER_REJECTED', orderId, 'Order', {
      studentId: order.studentId,
    });

    return failed;
  }

  // Webhook Reconciliation (Paymob & Fawry Idempotent Processing)
  static async processPaymobWebhook(data: {
    orderId: string;
    transactionRef: string;
    success: boolean;
    amount?: number;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { product: true },
    });
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Amount reconciliation: never fulfill an order for less than its price.
    if (data.amount !== undefined) {
      const expected = Number(order.totalAmountEgp);
      if (!Number.isFinite(data.amount) || data.amount + 0.009 < expected) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.FAILED, transactionRef: data.transactionRef },
        });
        throw new BadRequestError('Payment amount does not match the order total');
      }
    }

    return this.fulfillOrder(order.id, order.status, data.transactionRef, data.success);
  }

  /**
   * Fawry webhooks arrive in Fawry's body shape ({merchantCode,
   * merchantRefNum, amount, statusCode}) - NOT Paymob's. merchantRefNum is
   * whatever reference the merchant set at charge time; we accept either our
   * orderId or our idempotencyKey as that reference.
   */
  static async processFawryWebhook(data: {
    merchantRefNum: string;
    amount: string | number;
    success?: boolean;
    statusCode?: string | number;
  }) {
    if (!data.merchantRefNum) {
      throw new BadRequestError('merchantRefNum is required');
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: data.merchantRefNum }, { idempotencyKey: data.merchantRefNum }],
      },
      include: { product: true },
    });
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const paidAmount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
    const expected = Number(order.totalAmountEgp);
    if (!Number.isFinite(paidAmount) || paidAmount + 0.009 < expected) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.FAILED, transactionRef: data.merchantRefNum },
      });
      throw new BadRequestError('Payment amount does not match the order total');
    }

    // Fawry signals success via statusCode === 200; fall back to a boolean flag.
    const success =
      data.statusCode !== undefined ? String(data.statusCode) === '200' : data.success !== false;

    return this.fulfillOrder(order.id, order.status, data.merchantRefNum, success);
  }

  /** Idempotent PAID/FAILED transition + atomic entitlement grant. */
  private static async fulfillOrder(
    orderId: string,
    currentStatus: OrderStatus,
    transactionRef: string,
    success: boolean
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    });
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (currentStatus === OrderStatus.PAID || order.status === OrderStatus.PAID) {
      return { message: 'Order already processed', status: order.status, order };
    }

    if (!success) {
      const failedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.FAILED, transactionRef },
      });
      return { message: 'Order payment failed', status: OrderStatus.FAILED, order: failedOrder };
    }

    return await prisma.$transaction(
      async (tx) => {
        // Update order status to PAID
        const paidOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PAID, transactionRef },
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

  static async checkCourseAccess(studentId: string, courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, subjectId: true, gradeId: true },
    });
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const now = new Date();
    const entitlement = await prisma.entitlement.findFirst({
      where: {
        studentId,
        status: EntitlementStatus.ACTIVE,
        OR: [
          {
            resourceType: EntitlementType.COURSE,
            resourceId: course.id,
          },
          {
            resourceType: EntitlementType.SUBJECT,
            resourceId: course.subjectId,
          },
          ...(course.gradeId
            ? [
                {
                  resourceType: EntitlementType.GRADE_BUNDLE,
                  resourceId: course.gradeId,
                },
              ]
            : []),
        ],
        AND: [
          {
            OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
          },
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
    if (!code) {
      throw new NotFoundError('Invalid or expired voucher code');
    }

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

    // Atomic conditional increment
    const updateResult = await prisma.voucher.updateMany({
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

    // Grant Entitlement for the student
    const startsAt = new Date();
    const expiresAt = voucher.durationDays
      ? new Date(startsAt.getTime() + voucher.durationDays * 24 * 60 * 60 * 1000)
      : null;

    return await prisma.entitlement.create({
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
  }

  static async getAllVouchers() {
    return await prisma.voucher.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  static async deleteVoucher(id: string) {
    return await prisma.voucher.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

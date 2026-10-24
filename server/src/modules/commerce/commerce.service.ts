import { prisma } from '../../prisma';
import { NotFoundError, BadRequestError, ConflictError } from '../../utils/errors';
import { logAuditAction } from '../audit/audit.service';
import { egpToUsd, getUsdToEgpRate } from '../../utils/currency';
import { AccessPolicy } from './access-policy.service';
import {
  ProductType,
  OrderStatus,
  PaymentMethod,
  EntitlementType,
  EntitlementSource,
  EntitlementStatus,
  Prisma,
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
    priceUsd?: number; // ignored — USD is derived from the exchange rate
  }) {
    return await prisma.product.create({
      data: {
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        description: data.description,
        productType: data.productType,
        resourceId: data.resourceId,
        priceEgp: data.priceEgp,
        priceUsd: await egpToUsd(data.priceEgp),
      },
    });
  }

  static async getAllProducts() {
    const [products, exchangeRate] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
      getUsdToEgpRate(),
    ]);
    const publicCourses = await prisma.course.findMany({ where: {
      id: { in: products.filter(p => p.productType === ProductType.COURSE).flatMap(p => p.resourceId ? [p.resourceId] : []) },
      isPublished: true, status: 'PUBLISHED', visibility: 'PUBLIC', retractedAt: null,
    }, select: { id: true } });
    const publicIds = new Set(publicCourses.map(course => course.id));

    // Product priceUsd is retained as a legacy persisted display field. EGP
    // is the charge source of truth, so catalog reads derive indicative USD
    // from the current rate instead of showing the stale rate from creation.
    return products.filter(product => product.productType !== ProductType.COURSE || (product.resourceId && publicIds.has(product.resourceId))).map((product) => ({
      ...product,
      priceUsd: Math.round((Number(product.priceEgp) / exchangeRate) * 100) / 100,
    }));
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
    const existingForKey = () => prisma.order.findUnique({ where: { idempotencyKey: data.idempotencyKey }, include: { product: true } });
    const verifyReplay = (order: NonNullable<Awaited<ReturnType<typeof existingForKey>>>) => {
      if (order.studentId !== studentId) throw new ConflictError('Idempotency key is already used by another account');
      if (order.productId !== data.productId || order.paymentMethod !== data.paymentMethod) throw new ConflictError('Idempotency key was used for a different checkout');
      return order;
    };
    const existingOrder = await existingForKey();
    if (existingOrder) {
      return verifyReplay(existingOrder);
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
    // Resolve indicative FX before taking a transaction connection. A global
    // Prisma read inside the transaction can deadlock a saturated pool.
    const displayRate = await getUsdToEgpRate();

    try { return await prisma.$transaction(async (tx) => {
      // Serialize checkout against archive/retraction updates. The row lock
      // means whichever lifecycle transition commits first determines sale eligibility.
      if (product.productType === ProductType.COURSE && product.resourceId) {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "courses" WHERE "id" = ${product.resourceId} FOR UPDATE`;
        const course = locked.length ? await tx.course.findUnique({
          where: { id: product.resourceId! },
          select: { status: true, isPublished: true, retractedAt: true, visibility: true },
        }) : null;
        if (!course || course.retractedAt || course.status !== 'PUBLISHED' || !course.isPublished) {
          throw new NotFoundError('Course is not available for purchase');
        }
        if (course.visibility === 'PRIVATE' && !(await AccessPolicy.resolveCourse(studentId, product.resourceId, tx)).allowed) {
          throw new NotFoundError('Course is not available for purchase');
        }
      }
      return tx.order.create({
        data: {
          student: { connect: { id: studentId } },
          product: { connect: { id: data.productId } },
          status: OrderStatus.PENDING,
          totalAmountEgp: product.priceEgp,
          totalAmountUsd: Math.round((Number(product.priceEgp) / displayRate) * 100) / 100,
          paymentMethod: data.paymentMethod,
          idempotencyKey: data.idempotencyKey,
          ...(data.transactionRef && { transactionRef: data.transactionRef }),
        },
        include: { product: true },
      });
    }); } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await existingForKey();
        if (winner) return verifyReplay(winner);
      }
      throw error;
    }
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
      order.transactionRef || `ADMIN-APPROVED-${adminId}`,
      true
    );

    // Audit only real transitions - idempotent no-ops must not spam the trail.
    if (result.grantedEntitlement) {
      await logAuditAction(adminId, 'ORDER_APPROVED', orderId, 'Order', {
        studentId: order.studentId,
        amountEgp: Number(order.totalAmountEgp),
      });
    }

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

    // Conditional so a rejection can never clobber a PAID status that a
    // concurrent webhook fulfillment just set.
    const rejected = await prisma.order.updateMany({
      where: { id: orderId, status: { not: OrderStatus.PAID } },
      data: { status: OrderStatus.FAILED },
    });
    if (rejected.count === 0) {
      throw new ConflictError('Cannot reject an already-paid order - issue a refund instead');
    }
    const failed = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

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

    // Amount reconciliation is MANDATORY and fail-closed: an omitted amount
    // means we cannot verify what was actually paid, so the order must never
    // be fulfilled on an unverified amount. The FAILED transition is
    // conditional so a late bad-amount retry cannot downgrade an order another
    // delivery already marked PAID.
    const expected = Number(order.totalAmountEgp);
    if (
      data.amount === undefined ||
      !Number.isFinite(data.amount) ||
      data.amount + 0.009 < expected
    ) {
      await prisma.order.updateMany({
        where: { id: order.id, status: { not: OrderStatus.PAID } },
        data: { status: OrderStatus.FAILED, transactionRef: data.transactionRef },
      });
      throw new BadRequestError('Payment amount does not match the order total');
    }

    return this.fulfillOrder(order.id, data.transactionRef, data.success);
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
      await prisma.order.updateMany({
        where: { id: order.id, status: { not: OrderStatus.PAID } },
        data: { status: OrderStatus.FAILED, transactionRef: data.merchantRefNum },
      });
      throw new BadRequestError('Payment amount does not match the order total');
    }

    // Fawry signals success via statusCode === 200; fall back to a boolean flag.
    const success =
      data.statusCode !== undefined ? String(data.statusCode) === '200' : data.success !== false;

    return this.fulfillOrder(order.id, data.merchantRefNum, success);
  }

  /** Idempotent PAID/FAILED transition + atomic entitlement grant. */
  private static async fulfillOrder(
    orderId: string,
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

    if (!success) {
      // Conditional transition so two concurrent failure deliveries can't
      // double-write; last writer wins harmlessly (same target state).
      const failedTransition = await prisma.order.updateMany({
        where: { id: orderId, status: { not: OrderStatus.PAID } },
        data: { status: OrderStatus.FAILED, transactionRef },
      });
      // Audit ONLY real state transitions so gateway retries don't spam.
      if (failedTransition.count > 0) {
        await logAuditAction(
          order.studentId,
          'PAYMENT_FAILED',
          orderId,
          'Order',
          { actor: 'webhooksystem', gatewayTransactionRef: transactionRef }
        );
      }
      const failedOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
      return { message: 'Order payment failed', status: OrderStatus.FAILED, order: failedOrder, grantedEntitlement: false };
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Conditional PAID transition: the WHERE clause is re-evaluated after
        // any concurrent transaction's row lock is released, so exactly one
        // webhook delivery (or admin approval) can win this update. The loser
        // sees count === 0 and returns idempotently instead of granting a
        // second entitlement.
        const claimed = await tx.order.updateMany({
          where: { id: orderId, status: { not: OrderStatus.PAID } },
          data: { status: OrderStatus.PAID, transactionRef },
        });
        if (claimed.count === 0) {
          const paidOrder = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
          return { message: 'Order already processed', status: paidOrder.status, order: paidOrder, grantedEntitlement: false };
        }

        // Grant Entitlement inside the exact same atomic transaction.
        if (!order.product.resourceId) {
          // Misconfigured catalog product: money was collected but there is
          // nothing to grant. Keep the PAID transition (the payment IS real)
          // but surface it loudly instead of failing silently.
          console.error(
            `[commerce] Product ${order.productId} has no resourceId - paid order ${orderId} fulfilled WITHOUT an entitlement`
          );
          const paidOrderOnly = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
          return { message: 'Payment reconciled but product has no resource to grant', status: OrderStatus.PAID, order: paidOrderOnly, grantedEntitlement: false };
        }

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

        const paidOrder = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
        return { message: 'Payment successfully reconciled', status: OrderStatus.PAID, order: paidOrder, grantedEntitlement: true };
      },
      { timeout: 20000, maxWait: 15000 }
    );

    // Audit after commit so we never record transitions that rolled back.
    if (result.grantedEntitlement) {
      await logAuditAction(
        order.studentId,
        'PAYMENT_CONFIRMED',
        orderId,
        'Order',
        {
          actor: 'webhooksystem',
          gatewayTransactionRef: transactionRef,
          resourceType: order.product.productType,
          resourceId: order.product.resourceId,
        }
      );
    } else if (result.status === OrderStatus.PAID && !order.product.resourceId) {
      await logAuditAction(
        order.studentId,
        'FULFILLMENT_INCOMPLETE',
        orderId,
        'Order',
        { actor: 'webhooksystem', reason: 'product_missing_resourceId', productId: order.productId }
      );
    }

    return result;
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
    const access = await AccessPolicy.resolveResource(studentId, resourceType, resourceId);
    return { hasAccess: access.allowed, entitlement: null, access };
  }

  static async checkCourseAccess(studentId: string, courseId: string) {
    const access = await AccessPolicy.resolveCourse(studentId, courseId);
    return { hasAccess: access.allowed, entitlement: null, access };
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

  static async redeemVoucher(studentId: string, code: string, expectedCourseId?: string) {
    if (!code) {
      throw new NotFoundError('Invalid or expired voucher code');
    }

    const voucher = await prisma.voucher.findUnique({
      where: { code },
    });

    if (!voucher || !voucher.isActive) {
      throw new NotFoundError('Invalid or expired voucher code');
    }
    if (expectedCourseId) {
      const course = await prisma.course.findUnique({ where: { id: expectedCourseId }, select: { id: true, subjectId: true, gradeId: true } });
      const applies = course && (
        voucher.resourceType === 'COURSE' && voucher.resourceId === course.id ||
        voucher.resourceType === 'SUBJECT' && voucher.resourceId === course.subjectId ||
        voucher.resourceType === 'GRADE_BUNDLE' && voucher.resourceId === course.gradeId
      );
      if (!applies) throw new BadRequestError('This voucher does not apply to the selected course');
    }

    const now = new Date();
    if (voucher.expiresAt && voucher.expiresAt < now) {
      throw new BadRequestError('Voucher code has expired');
    }

    const startsAt = new Date();
    const expiresAt = voucher.durationDays
      ? new Date(startsAt.getTime() + voucher.durationDays * 24 * 60 * 60 * 1000)
      : null;

    return await prisma.$transaction(
      async (tx) => {
        // Per-student dedupe: an already-active voucher grant for the same
        // resource is returned instead of burning another use.
        // Check for ANY active entitlement (purchase, subscription, or voucher)
        // to avoid wasting a voucher use on a resource the student already owns.
        const existingGrant = await tx.entitlement.findFirst({
          where: {
            studentId,
            resourceType: voucher.resourceType,
            resourceId: voucher.resourceId,
            status: EntitlementStatus.ACTIVE,
            OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
          },
        });
        if (existingGrant) {
          return existingGrant;
        }

        // Atomic conditional increment — caps maxUses under concurrency.
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

        // Grant Entitlement in the SAME transaction so a failed grant rolls
        // the use-counter back instead of burning a redemption for nothing.
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
      },
      { timeout: 20000, maxWait: 15000 }
    );
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

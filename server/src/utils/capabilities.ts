import { NextFunction, Request, Response } from 'express';

export type PlatformCapability =
  | 'CODE_EXECUTION'
  | 'COLLABORATIVE_BOARDS'
  | 'DEVELOPER_INTEGRATIONS'
  | 'AUTOMATED_PAYMENT_GATEWAYS';

/** Trust-boundary features stay disabled until their owning implementation
 * and security gates pass. AppConfig is presentation data, never authority. */
const RELEASED_CAPABILITIES: Readonly<Record<PlatformCapability, boolean>> = {
  CODE_EXECUTION: false,
  COLLABORATIVE_BOARDS: false,
  DEVELOPER_INTEGRATIONS: false,
  AUTOMATED_PAYMENT_GATEWAYS: false,
};

export function isCapabilityEnabled(capability: PlatformCapability): boolean {
  return RELEASED_CAPABILITIES[capability];
}

export function requireCapability(capability: PlatformCapability) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!isCapabilityEnabled(capability)) {
      return res.status(503).json({ success: false, code: 'FEATURE_DISABLED', message: `${capability} is not available.` });
    }
    next();
  };
}

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
  body: any;
  query: any;
  params: any;
  headers: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        subscriptionTier: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireEmailVerification = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.isEmailVerified) {
    res.status(403).json({ error: 'Email verification required' });
    return;
  }
  next();
};

export const requireSubscription = (tier: 'PRO' | 'INSTITUTIONAL') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const tiers = ['ANALYST', 'PRO', 'INSTITUTIONAL'];
    const userTier = req.user?.subscriptionTier || 'ANALYST';
    
    if (tiers.indexOf(userTier) < tiers.indexOf(tier)) {
      res.status(403).json({ error: `Subscription tier ${tier} required` });
      return;
    }
    next();
  };
};

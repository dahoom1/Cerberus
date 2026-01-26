import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user profile
router.get('/profile', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        subscriptionTier: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put(
  '/profile',
  [
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName } = req.body;

      const user = await prisma.user.update({
        where: { id: req.userId },
        data: {
          firstName,
          lastName,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          subscriptionTier: true,
          isEmailVerified: true,
        },
      });

      res.json({ user });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Get API keys
router.get('/api-keys', async (req: AuthRequest, res) => {
  try {
    const apiKeys = await prisma.exchangeApiKey.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        exchange: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ apiKeys });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// Add API key
router.post(
  '/api-keys',
  [
    body('exchange').isIn(['BINANCE', 'COINBASE', 'KRAKEN', 'BYBIT', 'OKX', 'BITFINEX', 'KUCOIN', 'GATEIO', 'HUOBI', 'BITGET']),
    body('apiKey').notEmpty(),
    body('apiSecret').notEmpty(),
    body('passphrase').optional(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { exchange, apiKey, apiSecret, passphrase } = req.body;

      // Encrypt sensitive data
      const encryptedApiKey = encrypt(apiKey);
      const encryptedApiSecret = encrypt(apiSecret);
      const encryptedPassphrase = passphrase ? encrypt(passphrase) : null;

      const exchangeApiKey = await prisma.exchangeApiKey.upsert({
        where: {
          userId_exchange: {
            userId: req.userId!,
            exchange,
          },
        },
        update: {
          apiKey: encryptedApiKey,
          apiSecret: encryptedApiSecret,
          passphrase: encryptedPassphrase,
          isActive: true,
        },
        create: {
          userId: req.userId!,
          exchange,
          apiKey: encryptedApiKey,
          apiSecret: encryptedApiSecret,
          passphrase: encryptedPassphrase,
        },
        select: {
          id: true,
          exchange: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({ apiKey: exchangeApiKey });
    } catch (error) {
      console.error('Add API key error:', error);
      res.status(500).json({ error: 'Failed to add API key' });
    }
  }
);

// Delete API key
router.delete('/api-keys/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.exchangeApiKey.delete({
      where: {
        id,
        userId: req.userId,
      },
    });

    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// Toggle API key active status
router.patch('/api-keys/:id/toggle', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const apiKey = await prisma.exchangeApiKey.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const updated = await prisma.exchangeApiKey.update({
      where: { id },
      data: {
        isActive: !apiKey.isActive,
      },
    });

    res.json({ apiKey: updated });
  } catch (error) {
    console.error('Toggle API key error:', error);
    res.status(500).json({ error: 'Failed to toggle API key' });
  }
});

export default router;

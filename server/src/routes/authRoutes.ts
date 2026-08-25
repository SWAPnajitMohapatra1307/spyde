import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import {
  registerUser,
  loginUser,
  rotateRefreshToken,
  revokeToken,
  getUserProfile,
} from '../services/authService';
import { authenticateToken } from '../middleware/auth';
import { phoneSchema, vpaSchema } from '../lib/zodSchemas';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  phone: phoneSchema,
  email: z.string().email().optional(),
  password: z.string().min(6).max(100),
  vpa: vpaSchema,
});

const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});

router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = registerSchema.parse(req.body);
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await registerUser(parsed, userAgent, ipAddress);

    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      },
    });
  })
);

router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = loginSchema.parse(req.body);
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await loginUser(parsed, userAgent, ipAddress);

    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      },
    });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = refreshSchema.parse(req.body);
    const tokenFromCookie = req.cookies?.refreshToken as string | undefined;
    const token = parsed.refreshToken || tokenFromCookie;

    if (!token) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Refresh token is required via cookie or request body',
        },
      });
      return;
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;
    const tokens = await rotateRefreshToken(token, userAgent, ipAddress);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = refreshSchema.parse(req.body);
    const tokenFromCookie = req.cookies?.refreshToken as string | undefined;
    const token = parsed.refreshToken || tokenFromCookie;

    if (token) {
      await revokeToken(token);
    }

    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  })
);

router.get(
  '/me',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const profile = await getUserProfile(userId);

    res.status(200).json({
      success: true,
      data: profile,
    });
  })
);

export default router;
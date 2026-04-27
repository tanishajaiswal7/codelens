import express from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/authController.js';
import { verifyToken } from '../../../middleware/authMiddleware.js';
import { avatarUpload } from '../../../middleware/avatarUpload.js';

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login
);

router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required')],
  authController.forgotPassword
);

router.post(
  '/reset-password/:token',
  [
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  authController.resetPassword
);

router.post('/logout', authController.logout);

router.get('/me', verifyToken, authController.getMe);

router.put(
  '/profile',
  verifyToken,
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email is required'),
  ],
  authController.updateProfile
);

router.put(
  '/avatar',
  verifyToken,
  avatarUpload.single('avatar'),
  authController.updateAvatar
);

export default router;

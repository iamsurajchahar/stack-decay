import { Request, Response, NextFunction } from 'express';
import { generateUserDigest, formatDigestEmail, sendWeeklyDigests } from '../services/digest.service';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler.middleware';

/**
 * GET /api/digest/preview — Preview the current user's weekly digest.
 */
export async function previewDigest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const digest = await generateUserDigest(req.userId!);

    if (!digest) {
      throw new AppError('No data available for digest', 404, 'NO_DIGEST_DATA');
    }

    res.json({
      status: 'success',
      data: { digest },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/digest/preview/html — Preview the email HTML.
 */
export async function previewDigestHtml(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const digest = await generateUserDigest(req.userId!);

    if (!digest) {
      throw new AppError('No data available for digest', 404, 'NO_DIGEST_DATA');
    }

    const { html } = formatDigestEmail(digest);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/digest/preferences — Update digest preferences.
 */
export async function updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { digestEnabled, digestDay } = req.body;

    const update: Record<string, unknown> = {};
    if (typeof digestEnabled === 'boolean') update.digestEnabled = digestEnabled;
    if (digestDay !== undefined) {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      if (!validDays.includes(digestDay)) {
        throw new AppError('Invalid digest day', 400, 'INVALID_DIGEST_DAY');
      }
      update.digestDay = digestDay;
    }

    const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true });
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    res.json({
      status: 'success',
      data: {
        digestEnabled: (user as any).digestEnabled ?? true,
        digestDay: (user as any).digestDay ?? 'monday',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/digest/send — Manually trigger weekly digests (admin/dev use).
 */
export async function triggerDigests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await sendWeeklyDigests();
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/db';

export const getBusiness = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user!.businessId },
    });

    if (!business) {
      res.status(404).json({ error: 'Business not found' });
      return;
    }

    res.status(200).json({ business });
  } catch {
    res.status(500).json({ error: 'Failed to fetch business' });
  }
};

export const updateBusiness = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await prisma.business.update({
      where: { id: req.user!.businessId },
      data: req.body,
    });

    res.status(200).json({ message: 'Business updated', business });
  } catch {
    res.status(500).json({ error: 'Failed to update business' });
  }
};
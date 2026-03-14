import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  getPayments,
  getPaymentsByInvoice,
  recordPayment,
  deletePayment,
  createStripeCheckout,
  createStripeCheckoutPublic,
  handleStripeWebhook,
  getPaymentSummary,
} from '../services/payment.service';

export const listPayments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await getPayments(req.user!.businessId);
    res.status(200).json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

export const listPaymentsByInvoice = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await getPaymentsByInvoice(
      String(req.params.invoiceId),
      req.user!.businessId
    );
    res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payments';
    res.status(400).json({ error: message });
  }
};

export const createPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payment = await recordPayment(req.user!.businessId, req.body);
    res.status(201).json({ message: 'Payment recorded successfully', payment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record payment';
    res.status(400).json({ error: message });
  }
};

export const removePayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await deletePayment(String(req.params.id), req.user!.businessId);
    res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete payment';
    const status = message === 'Payment not found' ? 404 : 400;
    res.status(status).json({ error: message });
  }
};

export const stripeCheckout = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await createStripeCheckout(
      req.body.invoiceId,
      req.user!.businessId
    );
    res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout';
    res.status(400).json({ error: message });
  }
};

export const stripeCheckoutPublic = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await createStripeCheckoutPublic(String(req.params.token));
    res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout';
    res.status(400).json({ error: message });
  }
};

export const stripeWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    await handleStripeWebhook(req.body, signature);
    res.status(200).json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook error';
    res.status(400).json({ error: message });
  }
};

export const paymentSummary = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const summary = await getPaymentSummary(req.user!.businessId);
    res.status(200).json({ summary });
  } catch {
    res.status(500).json({ error: 'Failed to fetch payment summary' });
  }
};
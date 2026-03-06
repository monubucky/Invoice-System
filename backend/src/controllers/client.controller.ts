import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientStats,
} from '../services/client.service';
import { clientQuerySchema } from '../utils/schemas';

export const listClients = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const query = clientQuerySchema.parse(req.query);
    const result = await getClients(req.user!.businessId, query);
    res.status(200).json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
};

export const getClient = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const client = await getClientById(req.params.id, req.user!.businessId);
    res.status(200).json({ client });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch client';
    const status = message === 'Client not found' ? 404 : 500;
    res.status(status).json({ error: message });
  }
};

export const createNewClient = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const client = await createClient(req.user!.businessId, req.body);
    res.status(201).json({ message: 'Client created successfully', client });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create client';
    res.status(400).json({ error: message });
  }
};

export const updateExistingClient = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const client = await updateClient(
      req.params.id,
      req.user!.businessId,
      req.body
    );
    res.status(200).json({ message: 'Client updated successfully', client });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update client';
    const status = message === 'Client not found' ? 404 : 400;
    res.status(status).json({ error: message });
  }
};

export const deleteExistingClient = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await deleteClient(req.params.id, req.user!.businessId);
    res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete client';
    const status = message === 'Client not found' ? 404 : 500;
    res.status(status).json({ error: message });
  }
};

export const getStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const stats = await getClientStats(req.user!.businessId);
    res.status(200).json({ stats });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
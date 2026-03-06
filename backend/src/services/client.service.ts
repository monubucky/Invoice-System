import prisma from '../config/db';
import {
  CreateClientInput,
  UpdateClientInput,
  ClientQueryInput,
} from '../utils/schemas';

export const getClients = async (
  businessId: string,
  query: ClientQueryInput
) => {
  const page = parseInt(query.page);
  const limit = parseInt(query.limit);
  const skip = (page - 1) * limit;

  const where = {
    businessId,
    isDeleted: false,
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { email: { contains: query.search, mode: 'insensitive' as const } },
        { phone: { contains: query.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [query.sortBy]: query.sortOrder },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        taxId: true,
        createdAt: true,
        _count: {
          select: { invoices: true },
        },
      },
    }),
    prisma.client.count({ where }),
  ]);

  return {
    clients,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

export const getClientById = async (id: string, businessId: string) => {
  const client = await prisma.client.findFirst({
    where: { id, businessId, isDeleted: false },
    include: {
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          dueDate: true,
          createdAt: true,
        },
      },
      _count: {
        select: { invoices: true },
      },
    },
  });

  if (!client) throw new Error('Client not found');

  // Calculate total revenue from this client
  const revenueData = await prisma.payment.aggregate({
    where: {
      invoice: { clientId: id, businessId },
    },
    _sum: { amount: true },
  });

  return {
    ...client,
    totalRevenue: revenueData._sum.amount || 0,
  };
};

export const createClient = async (
  businessId: string,
  data: CreateClientInput
) => {
  // Check for duplicate email within the same business
  const existing = await prisma.client.findFirst({
    where: { businessId, email: data.email, isDeleted: false },
  });

  if (existing) throw new Error('Client with this email already exists');

  const client = await prisma.client.create({
    data: { ...data, businessId },
  });

  return client;
};

export const updateClient = async (
  id: string,
  businessId: string,
  data: UpdateClientInput
) => {
  const client = await prisma.client.findFirst({
    where: { id, businessId, isDeleted: false },
  });

  if (!client) throw new Error('Client not found');

  // Check duplicate email if email is being updated
  if (data.email && data.email !== client.email) {
    const existing = await prisma.client.findFirst({
      where: { businessId, email: data.email, isDeleted: false },
    });
    if (existing) throw new Error('Client with this email already exists');
  }

  return prisma.client.update({
    where: { id },
    data,
  });
};

export const deleteClient = async (id: string, businessId: string) => {
  const client = await prisma.client.findFirst({
    where: { id, businessId, isDeleted: false },
  });

  if (!client) throw new Error('Client not found');

  // Soft delete
  await prisma.client.update({
    where: { id },
    data: { isDeleted: true },
  });

  return { message: 'Client deleted successfully' };
};

export const getClientStats = async (businessId: string) => {
  const [total, recentClients] = await Promise.all([
    prisma.client.count({
      where: { businessId, isDeleted: false },
    }),
    prisma.client.findMany({
      where: { businessId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: { select: { invoices: true } },
      },
    }),
  ]);

  return { total, recentClients };
};
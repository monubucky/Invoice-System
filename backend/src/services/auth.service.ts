import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { RegisterInput, LoginInput } from '../utils/schemas';

export const registerUser = async (data: RegisterInput) => {
  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error('Email already in use');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 12);

  // Create business + admin user in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: data.businessName,
        currency: data.currency || 'USD',
      },
    });

    const user = await tx.user.create({
      data: {
        businessId: business.id,
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    return { business, user };
  });

  // Generate tokens
  const payload = {
    userId: result.user.id,
    businessId: result.business.id,
    role: result.user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store refresh token in DB
  await prisma.user.update({
    where: { id: result.user.id },
    data: { refreshToken },
  });

  return {
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      businessId: result.business.id,
    },
    business: result.business,
    accessToken,
    refreshToken,
  };
};

export const loginUser = async (data: LoginInput) => {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: { business: true },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check password
  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  // Generate tokens
  const payload = {
    userId: user.id,
    businessId: user.businessId,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store refresh token
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
    },
    business: user.business,
    accessToken,
    refreshToken,
  };
};

export const refreshAccessToken = async (token: string) => {
  const decoded = verifyRefreshToken(token);

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user || user.refreshToken !== token) {
    throw new Error('Invalid refresh token');
  }

  const payload = {
    userId: user.id,
    businessId: user.businessId,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  return { accessToken };
};

export const logoutUser = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
};
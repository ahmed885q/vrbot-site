import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(email: string, password: string) {
    const passwordHash = await argon2.hash(password);
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });
  }

  async list() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

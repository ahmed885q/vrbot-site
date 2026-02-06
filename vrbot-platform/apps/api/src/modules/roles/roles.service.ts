import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type RoleName = 'admin' | 'deploy' | 'user';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureBaseRoles() {
    const base: RoleName[] = ['admin', 'deploy', 'user'];
    for (const name of base) {
      await this.prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
  }
}

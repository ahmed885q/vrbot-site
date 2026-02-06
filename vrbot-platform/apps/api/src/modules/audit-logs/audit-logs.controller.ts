import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('audit')
@Controller({ path: 'audit-logs', version: '1' })
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  }
}

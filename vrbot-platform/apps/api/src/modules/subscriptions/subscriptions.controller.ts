import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsIn } from 'class-validator';

class CreateSubscriptionDto {
  @IsString() userId!: string;
  @IsString() planId!: string;
  @IsOptional() @IsIn(['ACTIVE','CANCELED','PAST_DUE']) status?: 'ACTIVE'|'CANCELED'|'PAST_DUE';
}

@ApiTags('subscriptions')
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.subscription.findMany({
      include: { plan: true, user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  async create(@Body() dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({
      data: {
        userId: dto.userId,
        planId: dto.planId,
        status: (dto.status ?? 'ACTIVE') as any,
      },
    });
  }
}

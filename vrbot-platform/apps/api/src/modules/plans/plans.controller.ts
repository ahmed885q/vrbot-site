import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { IsInt, IsString, Min, IsObject } from 'class-validator';

class CreatePlanDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsInt() @Min(0) priceCents!: number;
  @IsString() currency!: string;
  @IsObject() limitsJson!: Record<string, any>;
}

@ApiTags('plans')
@Controller({ path: 'plans', version: '1' })
export class PlansController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.plan.findMany({ orderBy: { priceCents: 'asc' } });
  }

  @Post()
  async create(@Body() dto: CreatePlanDto) {
    return this.prisma.plan.create({ data: dto as any });
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SESSION_COOKIE_NAME } from '../auth/auth.constants';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('admin')
@ApiCookieAuth(SESSION_COOKIE_NAME)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  @ApiOkResponse({ description: 'Indicateur réservé aux administrateurs' })
  async summary(): Promise<{ users: number }> {
    const users = await this.prisma.user.count();
    return { users };
  }
}

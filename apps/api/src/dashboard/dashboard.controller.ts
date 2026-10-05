import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SESSION_COOKIE_NAME } from '../auth/auth.constants';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';

@ApiTags('dashboard')
@ApiCookieAuth(SESSION_COOKIE_NAME)
@Roles('USER', 'ADMIN')
@Controller('dashboard')
export class DashboardController {
  @Get()
  @ApiOkResponse({ description: 'Profil du tableau de bord' })
  home(@CurrentUser() user: AuthenticatedUser): { user: AuthenticatedUser } {
    return { user };
  }
}

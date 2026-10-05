import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SESSION_COOKIE_NAME } from '../auth/auth.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SyncErrorsQueryDto, SyncRequestDto } from './dto/sync-request.dto';
import { SyncService } from './sync/sync.service';

@ApiTags('admin')
@ApiCookieAuth(SESSION_COOKIE_NAME)
@Roles('ADMIN')
@Controller('admin/sync')
export class IngestionController {
  constructor(private readonly sync: SyncService) {}

  @Post('sets')
  syncSets(@CurrentUser() user: AuthenticatedUser, @Body() body: SyncRequestDto) {
    return this.sync.syncSets(user.id, body);
  }

  @Post('cards')
  syncCards(@CurrentUser() user: AuthenticatedUser, @Body() body: SyncRequestDto) {
    return this.sync.syncCards(user.id, body);
  }

  @Post('prices')
  syncPrices(@CurrentUser() user: AuthenticatedUser, @Body() body: SyncRequestDto) {
    return this.sync.syncPrices(user.id, body);
  }

  @Get('status')
  status() {
    return this.sync.status();
  }

  @Get('errors')
  errors(@Query() query: SyncErrorsQueryDto) {
    return this.sync.errors(query.runId);
  }
}

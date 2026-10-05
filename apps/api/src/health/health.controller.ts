import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { HealthService } from './health.service';
import type { HealthReport } from './health.types';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({ description: 'Service and database status' })
  async getHealth(): Promise<HealthReport> {
    const report = await this.healthService.check();
    if (report.status !== 'ok') {
      throw new ServiceUnavailableException(report);
    }
    return report;
  }
}

import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { CatalogService } from './catalog.service';
import { normalizeCatalogQuery } from './catalog.query';
import { ListCardsQueryDto } from './dto/list-cards.query';

@ApiTags('cards')
@Public()
@Controller('cards')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOkResponse({ description: 'Catalogue paginé' })
  list(@Query() query: ListCardsQueryDto) {
    return this.catalog.list(normalizeCatalogQuery(query));
  }

  @Get('filters')
  @ApiOkResponse({ description: 'Valeurs disponibles pour les filtres' })
  filters() {
    return this.catalog.filters();
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Détail d’une carte' })
  detail(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.catalog.detail(id);
  }
}

import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CATALOG_DIRECTIONS, CATALOG_SORTS, MAX_PAGE_SIZE } from '../catalog.query';

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export class ListCardsQueryDto {
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(32)
  set?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(80)
  rarity?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(8)
  language?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(32)
  variant?: string;

  @IsOptional()
  @IsIn(CATALOG_SORTS)
  sort?: string;

  @IsOptional()
  @IsIn(CATALOG_DIRECTIONS)
  direction?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;
}

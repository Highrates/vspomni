import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** Каноническая плашка слайда (или null = плашки нет). */
export class HeroPlaqueDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  subtitle!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  href?: string | null;
}

export class UpsertHeroSlideDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mobileImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  href?: string | null;

  /** `null` — без плашки; объект — полная плашка (title+subtitle+imageUrl) */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @ValidateNested()
  @Type(() => HeroPlaqueDto)
  plaque?: HeroPlaqueDto | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ReplaceHeroSlidesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertHeroSlideDto)
  items!: UpsertHeroSlideDto[];
}

/** Шаблон плашки в админке («заполнить пустые»), не источник для витрины. */
export class UpdateHeroPlaqueTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  subtitle!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  href?: string | null;
}

/** @deprecated alias — то же, что UpdateHeroPlaqueTemplateDto */
export { UpdateHeroPlaqueTemplateDto as UpdateHeroSecondaryBannerDto };

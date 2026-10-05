import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({ require_tld: false }, { message: 'Adresse e-mail invalide' })
  @MaxLength(254, { message: 'Adresse e-mail trop longue' })
  email!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(2, { message: 'Le nom affiché doit contenir au moins 2 caractères' })
  @MaxLength(80, { message: 'Le nom affiché ne peut pas dépasser 80 caractères' })
  displayName!: string;

  @IsString()
  @MinLength(10, { message: 'Le mot de passe doit contenir au moins 10 caractères' })
  @MaxLength(128, { message: 'Le mot de passe ne peut pas dépasser 128 caractères' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Le mot de passe doit contenir une lettre et un chiffre',
  })
  password!: string;
}

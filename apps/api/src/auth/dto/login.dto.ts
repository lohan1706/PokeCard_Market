import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({ require_tld: false }, { message: 'Adresse e-mail invalide' })
  @MaxLength(254, { message: 'Adresse e-mail trop longue' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Le mot de passe est requis' })
  @MaxLength(128, { message: 'Le mot de passe ne peut pas dépasser 128 caractères' })
  password!: string;
}

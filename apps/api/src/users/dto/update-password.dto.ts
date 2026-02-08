import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  user_id: string;

  @IsString()
  @MinLength(8)
  new_password: string;
}

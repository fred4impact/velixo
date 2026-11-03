import { IsOptional, IsString } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

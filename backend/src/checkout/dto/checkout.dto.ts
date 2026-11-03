import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class AddressInputDto {
  @IsString()
  fullName: string;

  @IsString()
  line1: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsString()
  postalCode: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CheckoutDto {
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ValidateIf((o: CheckoutDto) => !o.shippingAddressId)
  @ValidateNested()
  @Type(() => AddressInputDto)
  shippingAddress?: AddressInputDto;

  @ValidateIf((o: CheckoutDto) => !o.shippingAddress)
  @IsString()
  shippingAddressId?: string;

  @ValidateIf((o: CheckoutDto) => !o.billingAddressId)
  @ValidateNested()
  @Type(() => AddressInputDto)
  billingAddress?: AddressInputDto;

  @ValidateIf((o: CheckoutDto) => !o.billingAddress)
  @IsString()
  billingAddressId?: string;

  @IsIn(['STRIPE', 'COD'])
  paymentMethod: PaymentProvider;
}

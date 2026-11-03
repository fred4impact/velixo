import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slugify';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  private async uniqueSlug(name: string) {
    const base = slugify(name);
    let slug = base;
    let i = 1;
    while (await this.prisma.brand.findUnique({ where: { slug } })) {
      slug = `${base}-${++i}`;
    }
    return slug;
  }

  async create(dto: CreateBrandDto) {
    const slug = await this.uniqueSlug(dto.name);
    return this.prisma.brand.create({ data: { ...dto, slug } });
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.brand.delete({ where: { id } });
  }

  async updateLogo(id: string, logoUrl: string) {
    await this.findOne(id);
    return this.prisma.brand.update({ where: { id }, data: { logoUrl } });
  }
}

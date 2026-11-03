import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slugify';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      include: { children: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async uniqueSlug(name: string) {
    const base = slugify(name);
    let slug = base;
    let i = 1;
    while (await this.prisma.category.findUnique({ where: { slug } })) {
      slug = `${base}-${++i}`;
    }
    return slug;
  }

  async create(dto: CreateCategoryDto) {
    const slug = await this.uniqueSlug(dto.name);
    return this.prisma.category.create({
      data: { name: dto.name, slug, parentId: dto.parentId ?? null },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    if (dto.parentId === id) {
      throw new ConflictException('Category cannot be its own parent');
    }
    return this.prisma.category.update({
      where: { id },
      data: { name: dto.name, parentId: dto.parentId },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slugify';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductsDto, includeArchived = false) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ProductWhereInput = {
      isArchived: includeArchived ? undefined : false,
      categoryId: query.categoryId,
      brandId: query.brandId,
      ...(query.search && {
        OR: [
          { name: { contains: query.search } },
          { sku: { contains: query.search } },
          { description: { contains: query.search } },
        ],
      }),
      ...((query.minPrice !== undefined || query.maxPrice !== undefined) && {
        regularPrice: {
          gte: query.minPrice ?? undefined,
          lte: query.maxPrice ?? undefined,
        },
      }),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sortBy === 'price'
        ? { regularPrice: query.sortOrder ?? 'asc' }
        : query.sortBy === 'name'
          ? { name: query.sortOrder ?? 'asc' }
          : { createdAt: query.sortOrder ?? 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { images: true, brand: true, category: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true, brand: true, category: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { images: true, brand: true, category: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private async uniqueSlug(name: string) {
    const base = slugify(name);
    let slug = base;
    let i = 1;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${base}-${++i}`;
    }
    return slug;
  }

  async create(dto: CreateProductDto) {
    const existingSku = await this.prisma.product.findUnique({
      where: { sku: dto.sku },
    });
    if (existingSku) throw new ConflictException('SKU already exists');

    const slug = await this.uniqueSlug(dto.name);
    return this.prisma.product.create({
      data: {
        sku: dto.sku,
        name: dto.name,
        slug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        regularPrice: dto.regularPrice,
        salePrice: dto.salePrice,
        stockQty: dto.stockQty ?? 0,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        shortDescription: dto.shortDescription,
        regularPrice: dto.regularPrice,
        salePrice: dto.salePrice,
        stockQty: dto.stockQty,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        isArchived: dto.isArchived,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
  }

  async addImage(productId: string, url: string, sortOrder = 0) {
    await this.findOne(productId);
    return this.prisma.productImage.create({
      data: { productId, url, sortOrder },
    });
  }

  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image || image.productId !== productId)
      throw new NotFoundException('Image not found');
    await this.prisma.productImage.delete({ where: { id: imageId } });
  }
}

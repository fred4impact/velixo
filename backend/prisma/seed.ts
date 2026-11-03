import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Client as MinioClient } from 'minio';

const prisma = new PrismaClient();

const minio = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
  port: Number(process.env.MINIO_PORT ?? 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
});
const bucket = process.env.MINIO_BUCKET ?? 'product-images';
const publicUrl = (process.env.MINIO_PUBLIC_URL ?? 'http://localhost:9000').replace(/\/$/, '');

interface SeedProduct {
  sku: string;
  name: string;
  price: number;
  categorySlug: string;
  imageUrl: string;
}

const categories = [
  { name: 'Apparel', slug: 'apparel' },
  { name: 'Footwear', slug: 'footwear' },
  { name: 'Accessories', slug: 'accessories' },
];

// Curated, product-accurate photos (Unsplash) — replaces random picsum.photos placeholders.
const products: SeedProduct[] = [
  {
    sku: 'TSHIRT-001',
    name: 'Classic T-Shirt',
    price: 19.99,
    categorySlug: 'apparel',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&h=1200&fit=crop&q=80',
  },
  {
    sku: 'HOODIE-001',
    name: 'Pullover Hoodie',
    price: 49.99,
    categorySlug: 'apparel',
    imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1200&h=1200&fit=crop&q=80',
  },
  {
    sku: 'JACKET-001',
    name: 'Denim Jacket',
    price: 89.99,
    categorySlug: 'apparel',
    imageUrl: 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=1200&h=1200&fit=crop&q=80',
  },
  {
    sku: 'CAP-001',
    name: 'Baseball Cap',
    price: 14.99,
    categorySlug: 'accessories',
    imageUrl: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=1200&h=1200&fit=crop&q=80',
  },
  {
    sku: 'BACKPACK-001',
    name: 'Everyday Backpack',
    price: 79.99,
    categorySlug: 'accessories',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1200&h=1200&fit=crop&q=80',
  },
  {
    sku: 'SUNGLASSES-001',
    name: 'Classic Sunglasses',
    price: 34.99,
    categorySlug: 'accessories',
    imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=1200&h=1200&fit=crop&q=80',
  },
  {
    sku: 'WATCH-001',
    name: 'Minimalist Watch',
    price: 129.99,
    categorySlug: 'accessories',
    imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=1200&h=1200&fit=crop&q=80',
  },
  {
    sku: 'SNEAKER-001',
    name: 'Canvas Sneakers',
    price: 59.99,
    categorySlug: 'footwear',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&h=1200&fit=crop&q=80',
  },
];

async function ensureBucket() {
  const exists = await minio.bucketExists(bucket).catch(() => false);
  if (!exists) {
    await minio.makeBucket(bucket);
    await minio.setBucketPolicy(
      bucket,
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      }),
    );
  }
}

async function uploadSeedImage(sku: string, imageUrl: string): Promise<string> {
  // v2 suffix forces a re-upload for buckets that still hold the old picsum placeholders.
  const objectName = `products/seed-${sku.toLowerCase()}-v2.jpg`;
  const url = `${publicUrl}/${bucket}/${objectName}`;

  const alreadyUploaded = await minio.statObject(bucket, objectName).catch(() => null);
  if (alreadyUploaded) return url;

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch sample image for ${sku}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  await minio.putObject(bucket, objectName, buffer, buffer.length, {
    'Content-Type': 'image/jpeg',
  });

  return url;
}

async function main() {
  const adminEmail = 'admin@ecommerce.local';
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      firstName: 'Store',
      lastName: 'Admin',
      emailVerifiedAt: new Date(),
    },
  });

  const brand = await prisma.brand.upsert({
    where: { slug: 'generic' },
    update: {},
    create: { name: 'Generic', slug: 'generic', description: 'Default demo brand' },
  });

  const categoryBySlug = new Map<string, string>();
  for (const c of categories) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { name: c.name, slug: c.slug },
    });
    categoryBySlug.set(c.slug, category.id);
  }

  await ensureBucket();

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        slug: p.sku.toLowerCase(),
        description: `${p.name} — demo seed product.`,
        shortDescription: p.name,
        regularPrice: p.price,
        stockQty: 100,
        brandId: brand.id,
        categoryId: categoryBySlug.get(p.categorySlug),
      },
    });

    const hostedImageUrl = await uploadSeedImage(p.sku, p.imageUrl);
    const existingImage = await prisma.productImage.findFirst({
      where: { productId: product.id, url: hostedImageUrl },
    });
    if (!existingImage) {
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      await prisma.productImage.create({ data: { productId: product.id, url: hostedImageUrl } });
    }
  }

  console.log(`Seeded ${products.length} products with real sample images.`);
  console.log('Admin login: admin@ecommerce.local / Admin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

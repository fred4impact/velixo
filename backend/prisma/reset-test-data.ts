import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEEDED_SKUS = [
  'TSHIRT-001',
  'HOODIE-001',
  'JACKET-001',
  'CAP-001',
  'BACKPACK-001',
  'SUNGLASSES-001',
  'WATCH-001',
  'SNEAKER-001',
];
const SEEDED_CATEGORY_SLUGS = ['apparel', 'footwear', 'accessories'];
const SEEDED_STOCK_QTY = 100;

async function main() {
  // Carts/cart items — cascades at the DB level.
  const { count: cartsDeleted } = await prisma.cart.deleteMany({});

  // Orders — cascades order items + payment at the DB level. Must happen
  // before deleting customers (Order.userId has no cascade, so it would
  // otherwise block user deletion with an FK error).
  const { count: ordersDeleted } = await prisma.order.deleteMany({});

  // Customers — cascades addresses + refresh tokens at the DB level.
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    select: { id: true },
  });
  const customerIds = customers.map((c) => c.id);

  // VerificationToken has no declared FK/cascade, so clean it up explicitly.
  await prisma.verificationToken.deleteMany({
    where: { userId: { in: customerIds } },
  });
  const { count: customersDeleted } = await prisma.user.deleteMany({
    where: { role: 'CUSTOMER' },
  });

  // Products created by admin UI tests — cascades product images.
  const { count: productsDeleted } = await prisma.product.deleteMany({
    where: { sku: { notIn: SEEDED_SKUS } },
  });

  // Categories created by admin UI tests. Delete children before parents
  // (Category.parentId is NoAction, not cascading).
  const extraCategories = await prisma.category.findMany({
    where: { slug: { notIn: SEEDED_CATEGORY_SLUGS } },
    select: { id: true, parentId: true },
  });
  const extraIds = new Set(extraCategories.map((c) => c.id));
  const children = extraCategories.filter((c) => c.parentId && extraIds.has(c.parentId));
  const topLevel = extraCategories.filter((c) => !(c.parentId && extraIds.has(c.parentId)));
  await prisma.category.deleteMany({ where: { id: { in: children.map((c) => c.id) } } });
  await prisma.category.deleteMany({ where: { id: { in: topLevel.map((c) => c.id) } } });

  // Undo stock decrements from checkout tests.
  await prisma.product.updateMany({
    where: { sku: { in: SEEDED_SKUS } },
    data: { stockQty: SEEDED_STOCK_QTY },
  });

  console.log('Reset complete:');
  console.log(`  Carts deleted: ${cartsDeleted}`);
  console.log(`  Orders deleted: ${ordersDeleted}`);
  console.log(`  Customers deleted: ${customersDeleted}`);
  console.log(`  Test products deleted: ${productsDeleted}`);
  console.log(`  Test categories deleted: ${children.length + topLevel.length}`);
  console.log(`  Seeded product stock reset to ${SEEDED_STOCK_QTY}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

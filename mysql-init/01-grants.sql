-- Dev-only: allow the app user to create/drop the shadow database Prisma Migrate needs.
GRANT ALL PRIVILEGES ON *.* TO 'ecommerce'@'%';
FLUSH PRIVILEGES;

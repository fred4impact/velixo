export function formatPrice(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

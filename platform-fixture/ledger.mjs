export function invoice(lines, discountBasisPoints = 0) {
  if (!Number.isInteger(discountBasisPoints) || discountBasisPoints < 0 || discountBasisPoints > 10000) throw Error('Invalid discount');
  let cents = 0n;
  for (const [price, quantity] of lines) {
    if (!/^\d+\.\d{2}$/.test(price) || !Number.isSafeInteger(quantity) || quantity < 0) throw Error('Invalid line');
    cents += BigInt(price.replace('.', '')) * BigInt(quantity);
  }
  cents = (cents * BigInt(10000 - discountBasisPoints) + 5000n) / 10000n;
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

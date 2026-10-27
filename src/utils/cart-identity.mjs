export function sameCartLine(item, productId, variantId = null) {
  const itemVariantId = item?.variant_id ?? item?.variant?.id ?? null;
  return String(item?.id) === String(productId) && String(itemVariantId ?? '') === String(variantId ?? '');
}

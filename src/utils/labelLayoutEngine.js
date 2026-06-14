import { LABEL_CONFIG } from './labelConfig.js';

/**
 * Validates a product for label rendering and calculates optimal font sizes.
 */
function processLabelItem(product) {
  const name =
    product.medicine_name ||
    product.product_name ||
    product.name ||
    "MEDICINE";

  const price = Number(
    product.mrp ?? product.price ?? product.selling_price ?? 0
  ).toFixed(2);

  const barcode = product.short_barcode || product.barcode || product._id || product.id || "000000";

  let warnings = [];
  let nameFontSize = LABEL_CONFIG.fonts.nameMax;

  // Simple heuristic for name length validation
  if (name.length > 25) {
    nameFontSize = LABEL_CONFIG.fonts.nameMin;
  }
  
  if (name.length > 40) {
    warnings.push('Name is very long and might be truncated with an ellipsis.');
  }

  if (barcode.length > 10) {
    warnings.push('Barcode is long and might overflow or become too dense.');
  }

  return {
    name,
    price,
    barcode,
    nameFontSize,
    warnings
  };
}

/**
 * Transforms an array of { product, copies } into a structured layout of rows.
 */
export function calculateLayout(labelItems) {
  let labelsFlat = [];

  labelItems.forEach(({ product, copies }) => {
    const processedProduct = processLabelItem(product);
    for (let i = 0; i < copies; i++) {
      labelsFlat.push(processedProduct);
    }
  });

  if (labelsFlat.length > 100) {
    labelsFlat = labelsFlat.slice(0, 100);
  }

  const rows = [];
  for (let i = 0; i < labelsFlat.length; i += 2) {
    const prod1 = labelsFlat[i];
    const prod2 = labelsFlat[i + 1] || null;

    rows.push({
      id: `row-${i}`,
      leftLabel: prod1,
      rightLabel: prod2
    });
  }

  return {
    config: LABEL_CONFIG,
    totalLabels: labelsFlat.length,
    rows
  };
}

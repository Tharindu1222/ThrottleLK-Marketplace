export function composeListingTitle(input: {
  title?: string | null;
  brandName?: string | null;
  modelName?: string | null;
  manufactureYear?: number | null;
}): string {
  const brand = input.brandName?.trim() ?? '';
  const model = input.modelName?.trim() ?? '';
  const year = input.manufactureYear ? String(input.manufactureYear) : '';
  const stored = input.title?.trim() ?? '';

  let name = '';
  if (brand && model) {
    const modelHasBrand = model.toLowerCase().startsWith(brand.toLowerCase());
    name = modelHasBrand ? model : `${brand} ${model}`;
  } else if (model) {
    name = model;
  } else if (brand) {
    name = brand;
  } else {
    name = stored;
  }

  if (year) {
    const yearAlreadyInName = new RegExp(`\\b${year}\\b`).test(name);
    if (!yearAlreadyInName) {
      name = name ? `${name} ${year}` : year;
    }
  }

  return name.trim() || stored;
}

export function hasUnconfiguredProducts(value) {
  if (Array.isArray(value)) {
    return value.some(hasUnconfiguredProducts);
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  if (
    value.type === "product" &&
    value.attrs?.isConfigured === false
  ) {
    return true;
  }

  return Object.values(value).some(hasUnconfiguredProducts);
}

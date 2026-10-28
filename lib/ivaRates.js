export function validateIvaRate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Dados inválidos." };
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const rate = Number(body.rate);
  let countryCode = "PT";

  if (body.country_code === null) {
    countryCode = null;
  } else if (typeof body.country_code === "string") {
    countryCode = body.country_code.trim().toUpperCase() || null;
  } else if (body.country_code !== undefined) {
    return { error: "O código do país deve conter duas letras." };
  }

  if (!name || name.length > 100) {
    return { error: "O nome é obrigatório e deve ter no máximo 100 caracteres." };
  }

  if (
    (typeof body.rate !== "string" && typeof body.rate !== "number") ||
    body.rate === "" ||
    body.rate === null ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    rate > 999.99
  ) {
    return { error: "A taxa deve ser um número entre 0 e 999,99." };
  }

  if (countryCode !== null && !/^[A-Z]{2}$/.test(countryCode)) {
    return { error: "O código do país deve conter duas letras." };
  }

  return {
    data: {
      name,
      rate: rate.toFixed(2),
      country_code: countryCode,
    },
  };
}

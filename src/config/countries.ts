/** Countries offered at sign-up. Africa and the diaspora first, then the rest. */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "GH", name: "Ghana" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "ET", name: "Ethiopia" },
  { code: "EG", name: "Egypt" },
  { code: "MA", name: "Morocco" },
  { code: "SN", name: "Senegal" },
  { code: "CI", name: "Côte d’Ivoire" },
  { code: "CM", name: "Cameroon" },
  { code: "UG", name: "Uganda" },
  { code: "RW", name: "Rwanda" },
  { code: "TZ", name: "Tanzania" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
  { code: "BF", name: "Burkina Faso" },
  { code: "TG", name: "Togo" },
  { code: "BJ", name: "Benin" },
  { code: "ML", name: "Mali" },
  { code: "NE", name: "Niger" },
  { code: "SL", name: "Sierra Leone" },
  { code: "LR", name: "Liberia" },
  { code: "GM", name: "The Gambia" },
  { code: "DZ", name: "Algeria" },
  { code: "TN", name: "Tunisia" },
  { code: "AO", name: "Angola" },
  { code: "MZ", name: "Mozambique" },
  { code: "BW", name: "Botswana" },
  { code: "NA", name: "Namibia" },
  { code: "CD", name: "DR Congo" },
  { code: "BE", name: "Belgium" },
  { code: "NL", name: "Netherlands" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "SE", name: "Sweden" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "BR", name: "Brazil" },
  { code: "JM", name: "Jamaica" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "MY", name: "Malaysia" },
  { code: "IN", name: "India" },
  { code: "CN", name: "China" },
  { code: "AU", name: "Australia" },
  { code: "OT", name: "Another country" },
];

const NAMES = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));
export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export function countryName(code: string) {
  return NAMES[code] ?? "—";
}

export function countryFlag(code: string) {
  if (!code || code === "OT" || !/^[A-Z]{2}$/.test(code)) return "🌍";
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}

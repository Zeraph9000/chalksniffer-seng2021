export type MaterialCategory = {
  id: string;
  label: string;
  defaultUnit: string;
};

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  { id: "concrete", label: "Concrete & Cement", defaultUnit: "m³" },
  { id: "steel", label: "Steel & Rebar", defaultUnit: "t" },
  { id: "timber", label: "Timber & Framing", defaultUnit: "lm" },
  { id: "aggregates", label: "Aggregates & Sand", defaultUnit: "t" },
  { id: "bricks", label: "Bricks & Blocks", defaultUnit: "EA" },
  { id: "fixtures", label: "Fixtures & Fittings", defaultUnit: "EA" },
  { id: "roofing", label: "Roofing & Cladding", defaultUnit: "m²" },
  { id: "electrical", label: "Electrical", defaultUnit: "EA" },
  { id: "plumbing", label: "Plumbing", defaultUnit: "EA" },
  { id: "ppe", label: "PPE & Safety", defaultUnit: "EA" },
  { id: "tools", label: "Tools & Equipment", defaultUnit: "EA" },
  { id: "other", label: "Other", defaultUnit: "EA" },
];

export type Priority = {
  id: string;
  label: string;
  color: string;
};

export const PRIORITIES: Priority[] = [
  { id: "urgent", label: "Urgent", color: "text-red-600 bg-red-50 border-red-200" },
  { id: "standard", label: "Standard", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { id: "scheduled", label: "Scheduled", color: "text-ink-muted bg-surface border-surface-border" },
];

export type Supplier = {
  name: string;
  specialty: string;
};

export const SUPPLIER_DIRECTORY: Supplier[] = [
  { name: "Boral Australia", specialty: "Concrete & Aggregates" },
  { name: "BlueScope Steel", specialty: "Steel & Roofing" },
  { name: "Bunnings Trade", specialty: "General Building Supplies" },
  { name: "CSR Building Products", specialty: "Timber & Panels" },
  { name: "Adelaide Brighton Cement", specialty: "Cement & Lime" },
  { name: "Dulux Trade", specialty: "Paints & Coatings" },
  { name: "Reece Plumbing", specialty: "Plumbing & HVAC" },
  { name: "Middy's Electrical", specialty: "Electrical Supplies" },
  { name: "SafetyQuip", specialty: "PPE & Safety Equipment" },
  { name: "Hilti Australia", specialty: "Tools & Fasteners" },
];

export const SAMPLE_SITES = [
  "Barangaroo South Tower",
  "Westfield Parramatta Extension",
  "Sydney Metro Station Fit-out",
  "Darling Harbour Residential",
  "North Shore Hospital Wing B",
];

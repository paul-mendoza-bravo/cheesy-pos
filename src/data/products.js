export const products = [
  // ── HAMBURGUESAS SENCILLAS ──────────────────────────────────
  {
    id: 'h2',
    name: 'La Mexa',
    description: 'Nuestra especialidad de la casa.',
    price: 90.0,
    category: 'burgers',
    initial: 'M',
  },
  {
    id: 'h3',
    name: 'La BBQ',
    description: 'Salsa BBQ especial y crujiente tocino.',
    price: 85.0,
    category: 'burgers',
    initial: 'B',
  },
  {
    id: 'h4',
    name: 'La Hawaiana',
    description: 'Con piña asada, jamón y queso suizo.',
    price: 85.0,
    category: 'burgers',
    initial: 'H',
  },
  {
    id: 'h1',
    name: 'Clásica',
    description: 'La hamburguesa tradicional.',
    price: 75.0,
    category: 'burgers',
    initial: 'C',
  },

  // ── HAMBURGUESAS DOBLES (+$40) ──────────────────────────────
  {
    id: 'h2d',
    name: 'La Mexa Doble',
    description: 'Mexa con doble carne.',
    price: 130.0,
    category: 'burgers',
    initial: 'M',
    isDouble: true,
  },
  {
    id: 'h3d',
    name: 'La BBQ Doble',
    description: 'BBQ con doble carne.',
    price: 125.0,
    category: 'burgers',
    initial: 'B',
    isDouble: true,
  },
  {
    id: 'h4d',
    name: 'La Hawaiana Doble',
    description: 'Hawaiana con doble carne.',
    price: 125.0,
    category: 'burgers',
    initial: 'H',
    isDouble: true,
  },
  {
    id: 'h1d',
    name: 'Clásica Doble',
    description: 'Clásica con doble carne.',
    price: 115.0,
    category: 'burgers',
    initial: 'C',
    isDouble: true,
  },

  // ── GUARNICIONES ────────────────────────────────────────────
  {
    id: 's2',
    name: 'Papas Especiales',
    description: 'Con rajas, aderezo de la casa y tocineta.',
    price: 70.0,
    category: 'sides',
    initial: 'P',
  },
  {
    id: 's1',
    name: 'Papas Sencillas',
    description: 'Papas a la francesa clásicas.',
    price: 35.0,
    category: 'sides',
    initial: 'P',
  },

];

export const CATEGORIES = [
  { id: 'all', label: 'Todo' },
  { id: 'burgers', label: 'Hamburguesas' },
  { id: 'sides', label: 'Guarniciones' },
];

// Kept for backward compat with InventoryBOMView
export const MODIFIERS = {};

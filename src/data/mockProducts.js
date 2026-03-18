export const mockProducts = [
  // CATEGORÍA: HAMBURGUESAS (Priorizadas por margen y estrategia)
  {
    id: 'h2',
    name: 'La Mexa',
    description: 'Nuestra especialidad de la casa.',
    price: 80.0,
    category: 'burgers',
    image: '🌶️',
    hasModifiers: true
  },
  {
    id: 'h3',
    name: 'La BBQ',
    description: 'Salsa BBQ especial y crujiente tocino.',
    price: 75.0,
    category: 'burgers',
    image: '🥩',
    hasModifiers: true
  },
  {
    id: 'h4',
    name: 'La Hawaiana',
    description: 'Con piña asada, jamón y queso suizo.',
    price: 75.0,
    category: 'burgers',
    image: '🍍',
    hasModifiers: true
  },
  {
    id: 'h1',
    name: 'Clásica',
    description: 'La hamburguesa tradicional.',
    price: 65.0,
    category: 'burgers',
    image: '🍔',
    hasModifiers: true // Menos sugerida pero igual permite extras
  },

  // CATEGORÍA: GUARNICIONES (Cash Cows)
  {
    id: 's2',
    name: 'Papas Especiales',
    description: 'Con rajas, aderezo de la casa y tocineta.',
    price: 60.0,
    category: 'sides',
    image: '🔥',
    hasModifiers: false
  },
  {
    id: 's1',
    name: 'Papas Sencillas',
    description: 'Papas a la francesa clásicas.',
    price: 35.0,
    category: 'sides',
    image: '🍟',
    hasModifiers: false
  },

  // COMBO RÁPIDO (Caja O2O)
  {
    id: 'c1',
    name: 'COMBO MEXA',
    description: 'La Mexa + Papas Especiales',
    price: 140.0, // 80 + 60
    category: 'combos',
    image: '⚡',
    hasModifiers: false
  }
];

export const MODIFIERS = {
  doubleMeat: { id: 'mod1', name: 'Carne Doble', price: 15.0 },
  extraCheese: { id: 'mod2', name: 'Queso Extra', price: 10.0 } // Asumiendo $10 para el queso extra
};

export const CATEGORIES = [
  { id: 'all', label: 'Todo' },
  { id: 'combos', label: 'Atajos/Combos' },
  { id: 'burgers', label: 'Hamburguesas' },
  { id: 'sides', label: 'Guarniciones' }
];

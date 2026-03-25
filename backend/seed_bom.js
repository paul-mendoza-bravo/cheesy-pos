import pool, { setupDatabase } from './database.js';

const INSUMOS = [
  { name: 'Pan de Hamburguesa', unit: 'pieza', cost: 7.08 },
  { name: 'Carne Molida', unit: 'g', cost: 0.15 },
  { name: 'Queso', unit: 'rebanada', cost: 2.50 },
  { name: 'Tocino', unit: 'porción', cost: 5.00 },
  { name: 'Cebolla Caramelizada', unit: 'g', cost: 0.03 },
  { name: 'Aguacate', unit: 'porción', cost: 6.25 },
  { name: 'Lechuga', unit: 'porción', cost: 3.00 },
  { name: 'Caja Térmica', unit: 'pieza', cost: 2.17 },
  { name: 'Salsa BBQ', unit: 'porción', cost: 2.00 },
  { name: 'Piña', unit: 'rebanada', cost: 2.00 },
  { name: 'Porción de Papas', unit: 'porción', cost: 10.00 },
  { name: 'Aceite', unit: 'ml', cost: 0.05 },
  { name: 'Aderezo (Mayonesa/Catsup)', unit: 'porción', cost: 2.00 },
  { name: 'Rajas', unit: 'porción', cost: 1.50 },
  { name: 'Empaque Papas', unit: 'pieza', cost: 1.50 },
  { name: 'Sal', unit: 'pizca', cost: 0.10 },
];

const RECIPES = [
  // La Mexa - h2
  { product_id: 'h2', insumo: 'Pan de Hamburguesa', qty: 1 },
  { product_id: 'h2', insumo: 'Carne Molida', qty: 85 },
  { product_id: 'h2', insumo: 'Queso', qty: 1 },
  { product_id: 'h2', insumo: 'Tocino', qty: 1 },
  { product_id: 'h2', insumo: 'Cebolla Caramelizada', qty: 30 },
  { product_id: 'h2', insumo: 'Aguacate', qty: 1 },
  { product_id: 'h2', insumo: 'Lechuga', qty: 1 },
  { product_id: 'h2', insumo: 'Caja Térmica', qty: 1 },

  // La BBQ - h3
  { product_id: 'h3', insumo: 'Pan de Hamburguesa', qty: 1 },
  { product_id: 'h3', insumo: 'Carne Molida', qty: 85 },
  { product_id: 'h3', insumo: 'Queso', qty: 1 },
  { product_id: 'h3', insumo: 'Tocino', qty: 1 },
  { product_id: 'h3', insumo: 'Cebolla Caramelizada', qty: 30 },
  { product_id: 'h3', insumo: 'Salsa BBQ', qty: 1 },
  { product_id: 'h3', insumo: 'Caja Térmica', qty: 1 },

  // La Hawaiana - h4
  { product_id: 'h4', insumo: 'Pan de Hamburguesa', qty: 1 },
  { product_id: 'h4', insumo: 'Carne Molida', qty: 85 },
  { product_id: 'h4', insumo: 'Queso', qty: 1 },
  { product_id: 'h4', insumo: 'Piña', qty: 1 },
  { product_id: 'h4', insumo: 'Cebolla Caramelizada', qty: 30 },
  { product_id: 'h4', insumo: 'Caja Térmica', qty: 1 },

  // Clásica - h1
  { product_id: 'h1', insumo: 'Pan de Hamburguesa', qty: 1 },
  { product_id: 'h1', insumo: 'Carne Molida', qty: 85 },
  { product_id: 'h1', insumo: 'Queso', qty: 1 },
  { product_id: 'h1', insumo: 'Cebolla Caramelizada', qty: 30 },
  { product_id: 'h1', insumo: 'Lechuga', qty: 1 },
  { product_id: 'h1', insumo: 'Caja Térmica', qty: 1 },

  // Papas Especiales - s2
  { product_id: 's2', insumo: 'Porción de Papas', qty: 1 },
  { product_id: 's2', insumo: 'Aceite', qty: 50 },
  { product_id: 's2', insumo: 'Tocino', qty: 1 },
  { product_id: 's2', insumo: 'Aderezo (Mayonesa/Catsup)', qty: 1 },
  { product_id: 's2', insumo: 'Rajas', qty: 1 },
  { product_id: 's2', insumo: 'Empaque Papas', qty: 1 },

  // Papas Sencillas - s1
  { product_id: 's1', insumo: 'Porción de Papas', qty: 1 },
  { product_id: 's1', insumo: 'Aceite', qty: 50 },
  { product_id: 's1', insumo: 'Sal', qty: 1 },
  { product_id: 's1', insumo: 'Empaque Papas', qty: 1 },

  // Combo Mexa - c1
  { product_id: 'c1', insumo: 'Pan de Hamburguesa', qty: 1 },
  { product_id: 'c1', insumo: 'Carne Molida', qty: 85 },
  { product_id: 'c1', insumo: 'Queso', qty: 1 },
  { product_id: 'c1', insumo: 'Tocino', qty: 2 },
  { product_id: 'c1', insumo: 'Cebolla Caramelizada', qty: 30 },
  { product_id: 'c1', insumo: 'Aguacate', qty: 1 },
  { product_id: 'c1', insumo: 'Lechuga', qty: 1 },
  { product_id: 'c1', insumo: 'Caja Térmica', qty: 1 },
  { product_id: 'c1', insumo: 'Porción de Papas', qty: 1 },
  { product_id: 'c1', insumo: 'Aceite', qty: 50 },
  { product_id: 'c1', insumo: 'Aderezo (Mayonesa/Catsup)', qty: 1 },
  { product_id: 'c1', insumo: 'Rajas', qty: 1 },
  { product_id: 'c1', insumo: 'Empaque Papas', qty: 1 },

  // Carne Doble - mod1
  { product_id: 'mod1', insumo: 'Carne Molida', qty: 85 },

  // Queso Extra - mod2
  { product_id: 'mod2', insumo: 'Queso', qty: 1 },
];

async function seed() {
  await setupDatabase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear old data safely (assuming no dependencies using CASCADE or safe enough)
    await client.query('DELETE FROM recipes');
    await client.query('DELETE FROM inventory_counts');
    await client.query('DELETE FROM insumos');

    // 1. Insert Insumos and get map
    const insumoMap = {};
    for (const ins of INSUMOS) {
      const res = await client.query(
        'INSERT INTO insumos (name, unit, current_stock) VALUES ($1, $2, $3) RETURNING id, name',
        [ins.name, ins.unit, 0] // 0 stock for now
      );
      insumoMap[res.rows[0].name] = res.rows[0].id;
    }

    // 2. Insert Recipes
    for (const rec of RECIPES) {
      const insumoId = insumoMap[rec.insumo];
      if (!insumoId) {
         console.warn(`WARNING: Insumo ${rec.insumo} not found!`);
         continue;
      }
      await client.query(
        'INSERT INTO recipes (product_id, insumo_id, quantity) VALUES ($1, $2, $3)',
        [rec.product_id, insumoId, rec.qty]
      );
    }

    await client.query('COMMIT');
    console.log('Seed completed successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed error:', e);
  } finally {
    client.release();
    pool.end();
  }
}

seed();

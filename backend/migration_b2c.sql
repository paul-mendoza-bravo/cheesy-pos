-- ============================================================
-- Cheesy POS — Migración B2C Gateway
-- Ejecutar en el SQL Editor de Supabase
-- Fecha: 2026-03-19
-- ============================================================

-- PASO 1: Crear tabla de clientes directos
CREATE TABLE IF NOT EXISTS customers (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    phone         VARCHAR(50),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- PASO 2: Agregar columna 'source' a orders
-- Indica si el pedido fue creado por el POS interno o por un cliente directo
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'POS'
        CHECK (source IN ('POS', 'CLIENT'));

-- PASO 3: Agregar referencia al cliente directo que originó el pedido
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS customer_client_id INTEGER
        REFERENCES customers(id) ON DELETE SET NULL;

-- PASO 4: Extender el CHECK constraint de orders.status
-- IMPORTANTE: Verificar el nombre real del constraint antes con:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'orders'::regclass AND contype = 'c' AND conname LIKE '%status%';
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN (
        'PENDING',
        'ACCEPTED',
        'REJECTED',
        'COOKING',
        'READY',
        'DELIVERED',
        'TRASHED'
    ));

-- PASO 5: Verificación post-migración
-- Ejecutar estos SELECTs para confirmar que todo está correcto:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customers';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name IN ('source','customer_client_id');
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'orders'::regclass AND contype = 'c';

-- ============================================================
-- Cheesy POS — Migración BI: Ledger de Egresos (Cash Outflows)
-- Ejecutar en el SQL Editor de Supabase
-- Fecha: 2026-03-20
-- ============================================================

-- Tabla de egresos de efectivo no planificados (last-mile purchases)
-- Cada registro representa una salida de caja registrada manualmente por el admin.
CREATE TABLE IF NOT EXISTS cash_outflows (
    id          SERIAL PRIMARY KEY,
    amount      DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    recorded_by VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Verificación post-migración:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cash_outflows';

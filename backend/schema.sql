-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'ayudante', 'parillero', 'repartidor', 'marketer')),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('ACTIVE', 'PENDING_APPROVAL')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(100) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'READY', 'DELIVERED', 'TRASHED')),
    total DECIMAL(10, 2) NOT NULL,
    cajero_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    cocinero_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    repartidor_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    delivery_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(100) REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL,
    modifiers TEXT -- JSON string for modifiers
);

-- Order Events table (tracks every status change with who and when)
CREATE TABLE IF NOT EXISTS order_events (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(100) REFERENCES orders(id) ON DELETE CASCADE,
    estado VARCHAR(50) NOT NULL,
    usuario_id VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Insert demo admin user if not exists
INSERT INTO users (id, role, status)
VALUES ('SUPERADMIN', 'admin', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

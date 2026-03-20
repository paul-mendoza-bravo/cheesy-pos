import jwt from 'jsonwebtoken';

const getSecret = () => process.env.JWT_SECRET || 'dev_secret_key_b2c_123';

/**
 * Middleware: Autentica clientes directos (B2C).
 * Valida el JWT firmado con JWT_SECRET y verifica que type === 'customer'.
 * Inyecta req.customer = { id, name, email }
 */
export const authenticateCustomer = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorización requerido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, getSecret());

    if (decoded.type !== 'customer') {
      return res.status(403).json({ error: 'Este token no es válido para el portal de clientes.' });
    }

    req.customer = decoded; // { id, name, email, type, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesión expirada. Por favor inicia sesión nuevamente.' });
    }
    return res.status(401).json({ error: 'Token inválido.' });
  }
};

/**
 * Helper: Genera un JWT para un cliente directo.
 * @param {object} customer - { id, name, email }
 * @returns {string} JWT firmado (expira en 7 días)
 */
export const generateCustomerToken = (customer) => {
  return jwt.sign(
    {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      type: 'customer',
    },
    getSecret(),
    { expiresIn: '7d' }
  );
};

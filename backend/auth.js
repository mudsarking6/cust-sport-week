import jwt from 'jsonwebtoken';
import { collection, objectId, serialize } from './db.js';
import { config } from './config.js';

export const signToken = user => jwt.sign(
  { id: String(user._id), role: user.base_role },
  config.jwtSecret,
  { expiresIn: '12h' }
);

export async function auth(req, res, next) {
  let data;
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    data = jwt.verify(token, config.jwtSecret);
  } catch {
    res.status(401).json({ message: 'Session expired. Please sign in again.' });
    return;
  }
  const user = await collection('users').findOne(
    { _id: objectId(data.id), status: 'ACTIVE' },
    { projection: { password_hash: 0, initial_password_hash: 0 } }
  );
  if (!user) return res.status(401).json({ message: 'Account is unavailable' });
  req.user = serialize(user);
  req.user._id = user._id;
  next();
}

export const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.base_role)
    ? next()
    : res.status(403).json({ message: 'You do not have permission for this action' });

export async function coordinator(req, res, next) {
  if (req.user.base_role === 'HOD') return next();
  const assignment = await collection('assignments').findOne({
    teacher_id: req.user._id,
    status: 'ACTIVE'
  });
  return assignment
    ? next()
    : res.status(403).json({ message: 'Coordinator assignment required' });
}

export async function supportOrHod(req, res, next) {
  if (req.user.base_role === 'HOD') return next();
  const assignment = await collection('assignments').findOne({
    teacher_id: req.user._id,
    assignment_role: 'SUPPORT_COORDINATOR',
    status: 'ACTIVE'
  });
  return assignment
    ? next()
    : res.status(403).json({ message: 'HOD or Support Coordinator permission required' });
}

export async function supportOnly(req, res, next) {
  const assignment = await collection('assignments').findOne({
    teacher_id: req.user._id,
    assignment_role: 'SUPPORT_COORDINATOR',
    status: 'ACTIVE'
  });
  return assignment
    ? next()
    : res.status(403).json({ message: 'Support Coordinator permission required' });
}

export function operational(req, res, next) {
  if (req.user.base_role === 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Super Admin access is limited to account management' });
  }
  next();
}

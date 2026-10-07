import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { config, validateMongoUri } from './config.js';

let client;
let database;

const defaultGames = [
  'Cricket', 'Football', 'Basketball', 'Volleyball', 'Races (Relay Race)', 'Javelin Throw',
  'Shot Put', 'Disc Throw', 'Ground Tennis (Singles)', 'Table Tennis (Singles)',
  'Badminton (Singles)', 'Chess', 'Squash (Singles)', 'Snooker', 'Ground Tennis (Doubles)',
  'Table Tennis (Doubles)', 'Badminton (Doubles)', 'Squash (Doubles)', 'Tug of War'
];

export function collection(name) {
  if (!database) throw new Error('MongoDB has not been initialized.');
  return database.collection(name);
}

export function objectId(value) {
  if (value instanceof ObjectId) return value;
  return typeof value === 'string' && ObjectId.isValid(value) ? new ObjectId(value) : null;
}

export const idString = value => value ? String(value) : null;
export const newId = () => new ObjectId();
export const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

export function serialize(document) {
  if (!document) return document;
  const output = { ...document, id: idString(document._id) };
  delete output._id;
  for (const [key, value] of Object.entries(output)) {
    if (value instanceof ObjectId) output[key] = idString(value);
    else if (Array.isArray(value)) output[key] = value.map(item => item instanceof ObjectId ? idString(item) : item);
  }
  return output;
}

export async function initDb() {
  validateMongoUri(config.mongoUri);
  client = new MongoClient(config.mongoUri);
  await client.connect();
  database = client.db(config.mongoDatabase);
  await Promise.all([
    collection('users').createIndex({ email: 1 }, { unique: true }),
    collection('games').createIndex({ name: 1 }, { unique: true }),
    collection('assignments').createIndex({ teacher_id: 1, status: 1 }),
    collection('assignments').createIndex(
      { assignment_role: 1 },
      { unique: true, partialFilterExpression: { assignment_role: 'SUPPORT_COORDINATOR', status: 'ACTIVE' } }
    ),
    collection('sheets').createIndex({ submitted_by: 1, created_at: -1 }),
    collection('student_records').createIndex({ sheet_id: 1 }),
    collection('notifications').createIndex({ user_id: 1, created_at: -1 }),
    collection('announcements').createIndex({ created_at: -1 }),
    collection('announcement_views').createIndex({ announcement_id: 1, user_id: 1 }, { unique: true }),
    collection('forwards').createIndex({ sheet_id: 1, forwarded_to: 1 }),
    collection('reminders').createIndex({ sender_id: 1, recipient_id: 1, created_at: 1 }),
    collection('sheet_deletions').createIndex({ sheet_id: 1, user_id: 1 }, { unique: true }),
    collection('terms').createIndex({ code: 1 }, { unique: true }),
    collection('term_forwards').createIndex({ term_id: 1, forwarded_to: 1 }, { unique: true }),
    collection('victory_badges').createIndex({ created_at: -1 }),
    collection('badge_recipients').createIndex({ badge_id: 1, user_id: 1 }, { unique: true })
  ]);
  const administrator = await seedSuperAdmin();
  await Promise.all(defaultGames.map(name => collection('games').updateOne(
    { name },
    { $setOnInsert: {
      name,
      description: `Official ${name} event for CUST Sports Week`,
      status: 'ACTIVE',
      created_by: administrator._id,
      created_at: now(),
      updated_at: now()
    } },
    { upsert: true }
  )));
}

async function seedSuperAdmin() {
  const users = collection('users');
  const existing = await users.findOne({ email: config.superAdminEmail.toLowerCase() });
  if (existing?.bootstrap_password_applied) return existing;
  if (!config.superAdminPassword) {
    throw new Error('Set SUPER_ADMIN_PASSWORD in the server environment before the first start of the fresh MongoDB database.');
  }
  const passwordHash = await bcrypt.hash(config.superAdminPassword, 12);
  if (existing) {
    await users.updateOne({ _id: existing._id }, { $set: {
      password_hash: passwordHash,
      initial_password_hash: passwordHash,
      base_role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      bootstrap_password_applied: true
    } });
    return { ...existing, base_role: 'SUPER_ADMIN', status: 'ACTIVE' };
  }
  const administrator = {
    name: 'System Administrator',
    email: config.superAdminEmail.toLowerCase(),
    password_hash: passwordHash,
    initial_password_hash: passwordHash,
    base_role: 'SUPER_ADMIN',
    department: 'Administration',
    phone: '',
    status: 'ACTIVE',
    bootstrap_password_applied: true,
    created_at: now(),
    created_by: null
  };
  const result = await users.insertOne(administrator);
  administrator._id = result.insertedId;
  return administrator;
}

export async function closeDb() {
  if (client) await client.close();
}

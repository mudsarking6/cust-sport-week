import {db,initDb} from '../server/db.js';

initDb();
const result=db.prepare("DELETE FROM notifications WHERE type='REMINDER'").run();
console.log(`Removed ${result.changes} duplicate reminder notification(s).`);

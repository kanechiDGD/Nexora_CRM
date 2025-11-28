// check-fks.js
import { db } from './drizzle/db.js';

async function checkForeignKeys() {
  try {
    const result = await db.execute(`
      SELECT 
        TABLE_NAME,
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE REFERENCED_TABLE_NAME = 'clients' 
        AND REFERENCED_COLUMN_NAME = 'id'
        AND CONSTRAINT_SCHEMA = DATABASE()
    `);
    
    console.log('=== FOREIGN KEYS QUE REFERENCIAN clients.id ===');
    if (result[0].length === 0) {
      console.log('No se encontraron foreign keys');
    } else {
      console.table(result[0]);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkForeignKeys();
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrateClientsId() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL no está configurado');
    }

    const connection = await mysql.createConnection(process.env.DATABASE_URL);

    try {
        console.log('🔧 Iniciando migración de clients.id a VARCHAR(50)...\n');

        // Deshabilitar verificación de foreign keys
        await connection.query('SET FOREIGN_KEY_CHECKS=0');
        console.log('✓ Foreign key checks deshabilitadas');

        // Cambiar clients.id - primero eliminar auto_increment, luego PK, luego cambiar tipo
        console.log('\n🔄 Modificando clients.id...');
        await connection.query('ALTER TABLE `clients` MODIFY COLUMN `id` INT NOT NULL');
        console.log('  ↳ Auto_increment eliminado');
        await connection.query('ALTER TABLE `clients` DROP PRIMARY KEY');
        console.log('  ↳ Primary key eliminada');
        await connection.query('ALTER TABLE `clients` MODIFY COLUMN `id` VARCHAR(50) NOT NULL');
        console.log('  ↳ Tipo cambiado a VARCHAR(50)');
        await connection.query('ALTER TABLE `clients` ADD PRIMARY KEY (`id`)');
        console.log('✓ clients.id completado con nueva PK');

        // Cambiar todas las columnas clientId
        console.log('\n🔄 Modificando columnas clientId...');
        const tables = ['activityLogs', 'constructionProjects', 'documents', 'events', 'tasks'];

        for (const table of tables) {
            await connection.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`clientId\` VARCHAR(50)`);
            console.log(`  ✓ ${table}.clientId → VARCHAR(50)`);
        }

        // Recrear foreign keys
        console.log('\n🔗 Recreando foreign keys...');

        await connection.query(`
      ALTER TABLE \`activityLogs\` 
      ADD CONSTRAINT \`activityLogs_clientId_clients_id_fk\` 
      FOREIGN KEY (\`clientId\`) REFERENCES \`clients\`(\`id\`) 
      ON DELETE CASCADE
    `);
        console.log('  ✓ activityLogs FK');

        await connection.query(`
      ALTER TABLE \`documents\` 
      ADD CONSTRAINT \`documents_clientId_clients_id_fk\` 
      FOREIGN KEY (\`clientId\`) REFERENCES \`clients\`(\`id\`) 
      ON DELETE CASCADE
    `);
        console.log('  ✓ documents FK');

        await connection.query(`
      ALTER TABLE \`constructionProjects\` 
      ADD CONSTRAINT \`constructionProjects_clientId_clients_id_fk\` 
      FOREIGN KEY (\`clientId\`) REFERENCES \`clients\`(\`id\`) 
      ON DELETE SET NULL
    `);
        console.log('  ✓ constructionProjects FK');

        // Restaurar verificación
        await connection.query('SET FOREIGN_KEY_CHECKS=1');
        console.log('\n✅ ¡Migración completada exitosamente!');

    } catch (error: any) {
        console.error('\n❌ Error durante la migración:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

migrateClientsId()
    .then(() => {
        console.log('\n🎉 Script finalizado. Ahora ejecuta: pnpm db:push');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ La migración falló:', error);
        process.exit(1);
    });

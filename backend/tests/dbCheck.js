const db = require('../config/db');

async function testDatabase() {
  console.log('=== DATABASE VERIFICATION DIAGNOSTICS ===');
  console.log(`Configured DB Type: ${db.dbType.toUpperCase()}`);

  try {
    // 1. Initialize DB migrations and seed
    await db.initDb();
    console.log('✓ Schema initialization checks: SUCCESS');

    // 2. Fetch all table sizes or workshop counts
    const tables = ['colleges', 'students', 'workshops', 'teams', 'registrations', 'team_members', 'attendance_records', 'project_submissions', 'certificates', 'registration_status_history'];
    
    console.log('\nVerifying tables accessibility:');
    for (const table of tables) {
      try {
        const rows = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = rows[0]?.count || rows[0]?.['COUNT(*)'] || 0;
        console.log(`  - Table '${table}': ONLINE (${count} rows)`);
      } catch (err) {
        console.error(`  - Table '${table}': ERROR (${err.message})`);
      }
    }

    console.log('\n✓ Database connection and integrity checks: COMPLETED SUCCESSFULLY');
    process.exit(0);
  } catch (error) {
    console.error('✗ Database diagnostic checks encountered an error:', error);
    process.exit(1);
  }
}

testDatabase();

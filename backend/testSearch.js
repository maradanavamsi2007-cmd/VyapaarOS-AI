const db = require('./config/db');
const attendanceController = require('./controllers/attendanceController');

async function testSearch() {
  await db.initDb();

  const req = {
    query: {
      workshopId: '1',
      dayNumber: '1',
      date: '2026-06-25',
      search: ''
    }
  };

  const res = {
    status: (code) => {
      console.log('Status code:', code);
      return {
        json: (data) => console.log('Response JSON (Error):', data)
      };
    },
    json: (data) => {
      console.log('Response JSON (Success):', JSON.stringify(data, null, 2));
    }
  };

  console.log('--- RUNNING getAttendanceList ---');
  await attendanceController.getAttendanceList(req, res);
}

testSearch().catch(console.error);

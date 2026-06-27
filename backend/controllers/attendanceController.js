const db = require('../config/db');
const { checkAndGenerateCertificate } = require('../utils/certificateHelper');

// Helper to get today's date in YYYY-MM-DD format (local timezone)
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 1. Get student list with attendance status for a specific day (workshopId is optional)
exports.getAttendanceList = async (req, res) => {
  const { workshopId, dayNumber, date, search = '' } = req.query;

  if (!dayNumber) {
    return res.status(400).json({ success: false, message: 'dayNumber is required.' });
  }

  const dayNum = parseInt(dayNumber);
  if (isNaN(dayNum) || dayNum < 1 || dayNum > 7) {
    return res.status(400).json({ success: false, message: 'dayNumber must be between 1 and 7.' });
  }

  const targetDate = date || getTodayDateString();

  try {
    // Build registrations query: filter by confirmation_status = Approved
    let regsQuery = db.collection('registrations')
      .where('confirmation_status', '==', 'Approved');
    
    if (workshopId && workshopId !== 'all') {
      regsQuery = regsQuery.where('workshop_id', '==', parseInt(workshopId));
    }

    // Build attendance query: fetch ALL attendance records for selected workshop (or all) to calculate overall stats
    let attQuery = db.collection('student_attendance');
    
    if (workshopId && workshopId !== 'all') {
      attQuery = attQuery.where('workshop_id', '==', parseInt(workshopId));
    }

    // Fetch workshops, registrations, students, colleges, and attendance in parallel
    const [regsSnapshot, workshopsSnapshot, studentsSnapshot, collegesSnapshot, attSnapshot] = await Promise.all([
      regsQuery.get(),
      db.collection('workshops').get(),
      db.collection('students').get(),
      db.collection('colleges').get(),
      attQuery.get()
    ]);

    const registrations = regsSnapshot.docs.map(doc => doc.data());
    if (registrations.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Build fast lookup maps
    const workshopMap = {};
    workshopsSnapshot.docs.forEach(doc => {
      const w = doc.data();
      workshopMap[w.workshop_id] = w.title || '';
    });

    const studentMap = {};
    studentsSnapshot.docs.forEach(doc => {
      const s = doc.data();
      studentMap[s.student_id] = s;
    });

    const collegeMap = {};
    collegesSnapshot.docs.forEach(doc => {
      const c = doc.data();
      collegeMap[c.college_id] = c;
    });

    const attendanceMap = {}; // Key: studentId_workshopId (for the selected day)
    const statsMap = {}; // Key: studentId_workshopId (overall counts)
    attSnapshot.docs.forEach(doc => {
      const att = doc.data();
      const key = `${att.student_id}_${att.workshop_id}`;
      
      // Initialize stats if not present
      if (!statsMap[key]) {
        statsMap[key] = { present: 0, late: 0, absent: 0 };
      }

      if (att.status === 'Present') statsMap[key].present++;
      else if (att.status === 'Late') statsMap[key].late++;
      else if (att.status === 'Absent') statsMap[key].absent++;

      // If this is the record for the selected dayNum, store it in attendanceMap
      if (att.day_number === dayNum) {
        attendanceMap[key] = att;
      }
    });

    let result = [];
    registrations.forEach(reg => {
      const student = studentMap[reg.student_id];
      if (!student) return;

      const college = collegeMap[student.college_id] || {};
      const attRecord = attendanceMap[`${student.student_id}_${reg.workshop_id}`];
      
      const stats = statsMap[`${student.student_id}_${reg.workshop_id}`] || { present: 0, late: 0, absent: 0 };
      const attendedCount = stats.present + stats.late;
      const attendancePercentage = parseFloat((attendedCount / 7 * 100).toFixed(2));

      result.push({
        registration_id: reg.registration_id,
        student_id: student.student_id,
        name: student.name || 'Unknown',
        email: student.email || '',
        phone: student.phone || '',
        branch: student.branch || '',
        semester: student.semester || '',
        college_name: college.name || 'Unknown',
        workshop_id: reg.workshop_id,
        workshop_title: workshopMap[reg.workshop_id] || 'Unknown',
        confirmation_status: reg.confirmation_status || 'Approved',
        status: attRecord ? attRecord.status : 'Pending',
        attendance_date: attRecord ? attRecord.attendance_date : targetDate,
        attendance_id: attRecord ? attRecord.id : null,
        marked_time: attRecord ? (attRecord.updated_at || attRecord.created_at) : null,
        
        // New columns for Admin view
        present_days_count: attendedCount,
        total_days_count: 7,
        attendance_percentage: attendancePercentage
      });
    });

    // Apply search filter if present
    if (search) {
      const sLower = search.trim().toLowerCase().replace(/\s+/g, ' ');
      if (sLower) {
        result = result.filter(r => 
          r.name.toLowerCase().includes(sLower) || 
          String(r.student_id).includes(sLower) ||
          r.email.toLowerCase().includes(sLower) || 
          r.branch.toLowerCase().includes(sLower) ||
          r.semester.toLowerCase().includes(sLower) ||
          r.college_name.toLowerCase().includes(sLower) ||
          r.workshop_title.toLowerCase().includes(sLower)
        );
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching attendance list:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve attendance list.' });
  }
};

// 2. Mark or update attendance for a single student
exports.recordAttendance = async (req, res) => {
  const { studentId, workshopId, dayNumber, date, status } = req.body;

  if (!studentId || !workshopId || !dayNumber || !status) {
    return res.status(400).json({ success: false, message: 'studentId, workshopId, dayNumber, and status are required.' });
  }

  const dayNum = parseInt(dayNumber);
  if (isNaN(dayNum) || dayNum < 1 || dayNum > 7) {
    return res.status(400).json({ success: false, message: 'dayNumber must be between 1 and 7.' });
  }

  if (!['Present', 'Absent', 'Late'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be Present, Absent or Late.' });
  }

  const targetDate = date || getTodayDateString();
  const sId = parseInt(studentId);
  const wId = parseInt(workshopId);

  try {
    // Check duplicate by day_number
    const existRows = await db.collection('student_attendance')
      .where('student_id', '==', sId)
      .where('workshop_id', '==', wId)
      .where('day_number', '==', dayNum)
      .get();
    
    if (!existRows.empty) {
      const attId = existRows.docs[0].data().id || existRows.docs[0].id;
      await db.collection('student_attendance').doc(String(attId)).update({
        status,
        attendance_date: targetDate,
        updated_at: new Date().toISOString()
      });
    } else {
      const attId = await db.getNextId('student_attendance');
      await db.collection('student_attendance').doc(String(attId)).set({
        id: attId,
        student_id: sId,
        workshop_id: wId,
        day_number: dayNum,
        attendance_date: targetDate,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Trigger certificate check
    const regs = await db.collection('registrations')
      .where('student_id', '==', sId)
      .where('workshop_id', '==', wId)
      .get();
    if (!regs.empty) {
      await checkAndGenerateCertificate(regs.docs[0].data().registration_id);
    }

    res.json({ success: true, message: 'Attendance recorded successfully.' });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to record attendance.' });
  }
};

// 3. Mark or update attendance in bulk
exports.recordBulkAttendance = async (req, res) => {
  const { studentIds, workshopId, dayNumber, date, status } = req.body;

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ success: false, message: 'studentIds array is required.' });
  }

  if (!workshopId || !dayNumber || !status) {
    return res.status(400).json({ success: false, message: 'workshopId, dayNumber, and status are required.' });
  }

  const dayNum = parseInt(dayNumber);
  if (isNaN(dayNum) || dayNum < 1 || dayNum > 7) {
    return res.status(400).json({ success: false, message: 'dayNumber must be between 1 and 7.' });
  }

  if (!['Present', 'Absent', 'Late'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be Present, Absent or Late.' });
  }

  const targetDate = date || getTodayDateString();
  const wId = parseInt(workshopId);

  try {
    for (const sId of studentIds) {
      const parsedStudentId = parseInt(sId);
      
      const existRows = await db.collection('student_attendance')
        .where('student_id', '==', parsedStudentId)
        .where('workshop_id', '==', wId)
        .where('day_number', '==', dayNum)
        .get();

      if (!existRows.empty) {
        const attId = existRows.docs[0].data().id || existRows.docs[0].id;
        await db.collection('student_attendance').doc(String(attId)).update({
          status,
          attendance_date: targetDate,
          updated_at: new Date().toISOString()
        });
      } else {
        const attId = await db.getNextId('student_attendance');
        await db.collection('student_attendance').doc(String(attId)).set({
          id: attId,
          student_id: parsedStudentId,
          workshop_id: wId,
          day_number: dayNum,
          attendance_date: targetDate,
          status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    // Trigger certificate check for each student
    for (const sId of studentIds) {
      const regs = await db.collection('registrations')
        .where('student_id', '==', parseInt(sId))
        .where('workshop_id', '==', wId)
        .get();
      if (!regs.empty) {
        await checkAndGenerateCertificate(regs.docs[0].data().registration_id);
      }
    }

    res.json({ success: true, message: `Bulk attendance recorded for ${studentIds.length} students.` });
  } catch (error) {
    console.error('Error recording bulk attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to record bulk attendance.' });
  }
};

// 4. Get attendance statistics for administrative overview
exports.getAttendanceStats = async (req, res) => {
  const today = getTodayDateString();

  try {
    // 1. Total Registered (Approved) Students
    const regsSnapshot = await db.collection('registrations')
      .where('confirmation_status', '==', 'Approved')
      .get();
    const totalStudents = regsSnapshot.size;

    // 2. Fetch all attendance records
    const attendanceSnapshot = await db.collection('student_attendance').get();
    const allRecords = attendanceSnapshot.docs.map(doc => doc.data());

    // 3. Present Today & Absent Today
    const todayRecords = allRecords.filter(r => r.attendance_date === today);
    const presentToday = todayRecords.filter(r => r.status === 'Present').length;
    const absentToday = todayRecords.filter(r => r.status === 'Absent').length;

    // 4. Overall Attendance Percentage
    const markedCount = allRecords.length;
    const presentCount = allRecords.filter(r => r.status === 'Present').length;
    const overallPercentage = markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 100;

    // 5. Weekly summary (Day 1 to Day 7 distribution counts)
    const weeklySummary = {};
    for (let day = 1; day <= 7; day++) {
      const dayRecords = allRecords.filter(r => r.day_number === day);
      const present = dayRecords.filter(r => r.status === 'Present').length;
      const absent = dayRecords.filter(r => r.status === 'Absent').length;
      weeklySummary[`Day ${day}`] = { present, absent };
    }

    // 6. Attendance trends by workshop
    const workshopsSnapshot = await db.collection('workshops').get();
    const workshops = workshopsSnapshot.docs.map(doc => doc.data());
    
    const workshopTrends = workshops.map(w => {
      const wRecords = allRecords.filter(r => r.workshop_id === w.workshop_id);
      const wMarked = wRecords.length;
      const wPresent = wRecords.filter(r => r.status === 'Present').length;
      const percentage = wMarked > 0 ? Math.round((wPresent / wMarked) * 100) : 100;
      return {
        workshop_id: w.workshop_id,
        title: w.title,
        present: wPresent,
        absent: wMarked - wPresent,
        percentage
      };
    });

    res.json({
      success: true,
      data: {
        totalStudents,
        presentToday,
        absentToday,
        overallPercentage,
        weeklySummary,
        workshopTrends
      }
    });

  } catch (error) {
    console.error('Error compiling attendance statistics:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve attendance statistics.' });
  }
};

// 5. Compile report matrices
exports.getAttendanceReport = async (req, res) => {
  const { type, workshopId, date } = req.query;

  try {
    const workshopsSnapshot = await db.collection('workshops').get();
    const workshops = workshopsSnapshot.docs.map(doc => doc.data());
    const workshopMap = {}; workshops.forEach(w => { workshopMap[w.workshop_id] = w.title; });

    const studentsSnapshot = await db.collection('students').get();
    const students = studentsSnapshot.docs.map(doc => doc.data());
    const studentMap = {}; students.forEach(s => { studentMap[s.student_id] = s; });

    const collegesSnapshot = await db.collection('colleges').get();
    const colleges = collegesSnapshot.docs.map(doc => doc.data());
    const collegeMap = {}; colleges.forEach(c => { collegeMap[c.college_id] = c.name; });

    const attendanceSnapshot = await db.collection('student_attendance').get();
    const allRecords = attendanceSnapshot.docs.map(doc => doc.data());

    if (type === 'daily') {
      const targetDate = date || getTodayDateString();
      const dailyRecords = allRecords.filter(r => r.attendance_date === targetDate);
      
      const reportData = dailyRecords.map(r => {
        const student = studentMap[r.student_id] || {};
        return {
          id: r.id,
          date: r.attendance_date,
          day_number: r.day_number,
          student_id: r.student_id,
          student_name: student.name || 'Unknown',
          student_email: student.email || '',
          college_name: collegeMap[student.college_id] || 'Unknown',
          workshop_title: workshopMap[r.workshop_id] || 'Unknown',
          status: r.status
        };
      });

      return res.json({ success: true, type: 'daily', date: targetDate, data: reportData });
    }

    if (type === 'weekly') {
      if (!workshopId) {
        return res.status(400).json({ success: false, message: 'workshopId is required for weekly report.' });
      }

      const wId = parseInt(workshopId);
      
      // Get all approved students registered for this workshop
      const regsSnapshot = await db.collection('registrations')
        .where('workshop_id', '==', wId)
        .where('confirmation_status', '==', 'Approved')
        .get();
      
      const registrations = regsSnapshot.docs.map(doc => doc.data());
      const wRecords = allRecords.filter(r => r.workshop_id === wId);

      const reportData = registrations.map(reg => {
        const student = studentMap[reg.student_id] || {};
        const studentRecs = wRecords.filter(r => r.student_id === reg.student_id);

        const days = {};
        for (let d = 1; d <= 7; d++) {
          const rec = studentRecs.find(r => r.day_number === d);
          days[`day${d}`] = rec ? rec.status : 'Pending';
        }

        const presentCount = studentRecs.filter(r => r.status === 'Present').length;
        const markedCount = studentRecs.filter(r => r.status === 'Present' || r.status === 'Absent').length;
        const percentage = markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 0;

        return {
          student_id: reg.student_id,
          student_name: student.name || 'Unknown',
          student_email: student.email || '',
          college_name: collegeMap[student.college_id] || 'Unknown',
          workshop_title: workshopMap[wId] || 'Unknown',
          ...days,
          present_count: presentCount,
          percentage: percentage
        };
      });

      return res.json({ success: true, type: 'weekly', workshop_title: workshopMap[wId], data: reportData });
    }

    // Default: workshop-wise summary
    const reportData = workshops.map(w => {
      const wRecords = allRecords.filter(r => r.workshop_id === w.workshop_id);
      const totalCount = wRecords.length;
      const presentCount = wRecords.filter(r => r.status === 'Present').length;
      const absentCount = totalCount - presentCount;
      const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

      return {
        workshop_id: w.workshop_id,
        workshop_title: w.title,
        trainer_name: w.trainer_name || 'TBA',
        total_marked: totalCount,
        present_count: presentCount,
        absent_count: absentCount,
        percentage: percentage
      };
    });

    res.json({ success: true, type: 'workshop', data: reportData });

  } catch (error) {
    console.error('Error generating attendance reports:', error);
    res.status(500).json({ success: false, message: 'Failed to generate attendance reports.' });
  }
};

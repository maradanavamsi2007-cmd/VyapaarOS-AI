const db = require('../config/db');

// Submit new workshop registration
exports.registerWorkshop = async (req, res) => {
  const {
    name,
    collegeName,
    city,
    state,
    email,
    phone,
    branch,
    semester,
    workshopId,
    isGroup = false,
    teamName = '',
    members = [] // Array of { name, email, phone }
  } = req.body;

  // Basic Validations
  if (!name || !collegeName || !email || !phone || !workshopId || !branch || !semester) {
    return res.status(400).json({ success: false, message: 'All student details and workshop selection are required.' });
  }

  try {
    console.log('Backend request received at registerWorkshop:', req.body);
    console.log('Controller executed: registerWorkshop');
    
    // 1. Check if workshop is active and has space
    const workshopDoc = await db.collection('workshops').doc(String(workshopId)).get();
    if (!workshopDoc.exists) {
      return res.status(404).json({ success: false, message: 'Selected workshop does not exist.' });
    }
    const workshop = workshopDoc.data();
    if (workshop.status === 'Suspended') {
      return res.status(400).json({ success: false, message: 'This workshop has been suspended and is not accepting registrations.' });
    }
    if (workshop.status === 'Full') {
      return res.status(400).json({ success: false, message: 'This workshop is already full.' });
    }

    // 2. Resolve College (Find or Create)
    let collegeId;
    const cleanCollegeName = collegeName.trim();
    const collegeRows = await db.collection('colleges').where('name', '==', cleanCollegeName).get();
    
    console.log('Supabase insert started');
    
    if (!collegeRows.empty) {
      collegeId = collegeRows.docs[0].data().college_id;
    } else {
      const cityVal = city || 'Unknown';
      const stateVal = state || 'Unknown';
      const { id: generatedId } = await db.collection('colleges').add({
        name: cleanCollegeName,
        city: cityVal,
        state: stateVal
      });
      collegeId = parseInt(generatedId);
    }

    // 3. Resolve Student (Leader/Individual) (Find or Create)
    let studentId;
    const cleanEmail = email.trim().toLowerCase();
    const studentRows = await db.collection('students').where('email', '==', cleanEmail).get();
    
    if (!studentRows.empty) {
      studentId = studentRows.docs[0].data().student_id;
      // Update details to match current submission
      await db.collection('students').doc(String(studentId)).update({
        name: name.trim(),
        phone: phone.trim(),
        college_id: collegeId,
        branch,
        semester
      });
    } else {
      // Insert student without manually assigning primary key; let Supabase generate it.
      const { id: generatedId } = await db.collection('students').add({
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        college_id: collegeId,
        branch,
        semester
      });
      studentId = parseInt(generatedId);
      // Ensure mock fallback also stores the generated ID as student_id for consistency.

    }

    // 4. Duplicate Registration check for leader/individual
    const dupRows = await db.collection('registrations')
      .where('student_id', '==', studentId)
      .where('workshop_id', '==', parseInt(workshopId))
      .get();
    if (!dupRows.empty) {
      return res.status(400).json({
        success: false,
        message: `Student with email '${email}' is already registered for the ${workshop.title} workshop.`
      });
    }

    // 5. Duplicate check for group members
    if (isGroup && members && members.length > 0) {
      for (const member of members) {
        const memEmail = member.email.trim().toLowerCase();
        // Check if this member email is registered directly as a student
        const existingStudentRows = await db.collection('students').where('email', '==', memEmail).get();
        if (!existingStudentRows.empty) {
          const mStudentId = existingStudentRows.docs[0].data().student_id;
          const mDupRows = await db.collection('registrations')
            .where('student_id', '==', mStudentId)
            .where('workshop_id', '==', parseInt(workshopId))
            .get();
          if (!mDupRows.empty) {
            return res.status(400).json({
              success: false,
              message: `Team member with email '${member.email}' is already registered for this workshop.`
            });
          }
        }
        
        // Also check if they are already registered as a team member in another team for the same workshop
        const memberTeams = await db.collection('team_members').where('student_email', '==', memEmail).get();
        for (const mtDoc of memberTeams.docs) {
          const tId = mtDoc.data().team_id;
          const regCheck = await db.collection('registrations')
            .where('team_id', '==', tId)
            .where('workshop_id', '==', parseInt(workshopId))
            .get();
          if (!regCheck.empty) {
            return res.status(400).json({
              success: false,
              message: `Team member with email '${member.email}' is already registered in another team for this workshop.`
            });
          }
        }
      }
    }

    // 6. Handle Team Creation if Group Registration
    let teamId = null;
    if (isGroup) {
      const finalTeamName = teamName.trim() || `${name}'s Team`;
      const memberCount = (members ? members.length : 0) + 1; // Members + Leader
      console.log('Inserting new team →', {
        team_name: finalTeamName,
        leader_student_id: studentId,
        member_count: memberCount
      });
      const { id: teamGeneratedId } = await db.collection('teams').add({
        team_name: finalTeamName,
        leader_student_id: studentId,
        member_count: memberCount
      });
      teamId = parseInt(teamGeneratedId);

      // Insert team members
      if (members && members.length > 0) {
        for (const member of members) {
          console.log('Inserting new team member →', {
            team_id: teamId,
            student_name: member.name.trim(),
            student_email: member.email.trim().toLowerCase(),
            student_phone: member.phone.trim()
          });
          await db.collection('team_members').add({
            team_id: teamId,
            student_name: member.name.trim(),
            student_email: member.email.trim().toLowerCase(),
            student_phone: member.phone.trim()
          });
        }
      }
    }

    // 7. Insert Registration
    console.log('Inserting new registration →', {
      student_id: studentId,
      workshop_id: parseInt(workshopId),
      team_id: teamId,
      payment_status: 'Pending',
      confirmation_status: 'Pending',
      registration_date: new Date().toISOString()
    });
    const { id: registrationGeneratedId } = await db.collection('registrations').add({
      student_id: studentId,
      workshop_id: parseInt(workshopId),
      team_id: teamId,
      payment_status: 'Pending',
      confirmation_status: 'Pending',
      registration_date: new Date().toISOString()
    });
    const registrationId = parseInt(registrationGeneratedId);

    // 8. Insert History Record
    const historyId = await db.getNextId('registration_status_history');
    await db.collection('registration_status_history').doc(String(historyId)).set({
      history_id: historyId,
      registration_id: registrationId,
      previous_status: null,
      new_status: 'Pending',
      changed_by: 'System',
      remarks: 'Online registration submitted. Awaiting verification and payment completion.',
      changed_at: new Date().toISOString()
    });

    // 9. Send email notification asynchronously
    const mailer = require('../utils/mailer');
    mailer.sendRegistrationEmail(cleanEmail, {
      studentName: name.trim(),
      workshopTitle: workshop.title,
      trainerName: workshop.trainer_name,
      venue: workshop.venue,
      schedule: workshop.schedule,
      fee: workshop.fee,
      isGroup,
      teamName: isGroup ? (teamName.trim() || `${name}'s Team`) : ''
    }).catch(err => {
      console.error('Gracefully caught email error in controller:', err);
    });

    console.log('Supabase insert success');

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully!',
      data: {
        registrationId,
        studentId,
        workshopId,
        teamId
      }
    });

  } catch (error) {
    console.error('Error submitting registration:', error);
    res.status(500).json({ success: false, message: 'Failed to process registration. Please try again.' });
  }
};

// Get single registration detailed status view
exports.getRegistrationDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const regDoc = await db.collection('registrations').doc(String(id)).get();
    if (!regDoc.exists) {
      return res.status(404).json({ success: false, message: 'Registration not found.' });
    }
    const registration = regDoc.data();

    // Fetch Student
    const studentDoc = await db.collection('students').doc(String(registration.student_id)).get();
    const student = studentDoc.exists ? studentDoc.data() : {};

    // Fetch College
    let college = {};
    if (student.college_id) {
      const collegeDoc = await db.collection('colleges').doc(String(student.college_id)).get();
      college = collegeDoc.exists ? collegeDoc.data() : {};
    }

    // Fetch Workshop
    const workshopDoc = await db.collection('workshops').doc(String(registration.workshop_id)).get();
    const workshop = workshopDoc.exists ? workshopDoc.data() : {};

    // Fetch Team
    let team = {};
    if (registration.team_id) {
      const teamDoc = await db.collection('teams').doc(String(registration.team_id)).get();
      team = teamDoc.exists ? teamDoc.data() : {};
    }

    // Fetch team members if it's a team registration
    let teamMembers = [];
    if (registration.team_id) {
      const teamMembersSnapshot = await db.collection('team_members')
        .where('team_id', '==', registration.team_id)
        .get();
      teamMembers = teamMembersSnapshot.docs.map(doc => doc.data());
    }

    // Fetch history
    const historySnapshot = await db.collection('registration_status_history')
      .where('registration_id', '==', parseInt(id))
      .get();
    const history = historySnapshot.docs.map(doc => doc.data())
      .sort((a, b) => b.changed_at.localeCompare(a.changed_at));

    // Fetch attendance
    const attendanceSnapshot = await db.collection('attendance_records')
      .where('registration_id', '==', parseInt(id))
      .get();
    const attendance = attendanceSnapshot.docs.map(doc => doc.data())
      .sort((a, b) => a.session_date.localeCompare(b.session_date));

    // Fetch submissions
    const submissionsSnapshot = await db.collection('project_submissions')
      .where('registration_id', '==', parseInt(id))
      .get();
    const submissions = submissionsSnapshot.docs.map(doc => doc.data())
      .sort((a, b) => b.submission_date.localeCompare(a.submission_date));

    // Fetch certificates
    const certificatesSnapshot = await db.collection('certificates')
      .where('registration_id', '==', parseInt(id))
      .get();
    const certificates = certificatesSnapshot.docs.map(doc => doc.data());

    res.json({
      success: true,
      data: {
        registration_id: registration.registration_id,
        registration_date: registration.registration_date,
        payment_status: registration.payment_status,
        confirmation_status: registration.confirmation_status,
        created_at: registration.created_at || null,
        student_id: student.student_id,
        student_name: student.name || '',
        student_email: student.email || '',
        student_phone: student.phone || '',
        branch: student.branch || '',
        semester: student.semester || '',
        college_id: college.college_id || null,
        college_name: college.name || '',
        college_city: college.city || '',
        college_state: college.state || '',
        workshop_id: workshop.workshop_id,
        workshop_title: workshop.title || '',
        workshop_description: workshop.description || '',
        workshop_fee: workshop.fee || 0,
        trainer_name: workshop.trainer_name || '',
        team_id: team.team_id || null,
        team_name: team.team_name || '',
        member_count: team.member_count || 0,
        team_members: teamMembers,
        history,
        attendance,
        submissions,
        certificate: certificates[0] || null
      }
    });

  } catch (error) {
    console.error('Error fetching registration details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch registration details.' });
  }
};

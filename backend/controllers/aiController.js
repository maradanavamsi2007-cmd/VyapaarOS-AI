const db = require('../config/db');

// Helper to make call to Google Gemini API
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null; // Fallback to local templates
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      console.warn('Gemini API returned an error:', response.statusText);
      return null;
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return generatedText || null;
  } catch (error) {
    console.error('Error invoking Gemini API:', error);
    return null;
  }
}

// 1. Generate registration confirmation messages
exports.generateConfirmationMsg = async (req, res) => {
  const { id } = req.params;

  try {
    const regDoc = await db.collection('registrations').doc(String(id)).get();
    if (!regDoc.exists) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }
    const regData = regDoc.data();

    // Fetch Student details
    const studentDoc = await db.collection('students').doc(String(regData.student_id)).get();
    const student = studentDoc.exists ? studentDoc.data() : {};

    // Fetch Workshop details
    const workshopDoc = await db.collection('workshops').doc(String(regData.workshop_id)).get();
    const workshop = workshopDoc.exists ? workshopDoc.data() : {};

    // Fetch Team details if any
    let team = {};
    if (regData.team_id) {
      const teamDoc = await db.collection('teams').doc(String(regData.team_id)).get();
      team = teamDoc.exists ? teamDoc.data() : {};
    }

    const prompt = `Write a professional, welcoming registration confirmation email from "Sansah Innovations" to a student named ${student.name} who registered for the "${workshop.title}" workshop. Details: Registration ID: ${regData.registration_id}, Registration Type: ${team.team_name ? 'Group (Team: ' + team.team_name + ')' : 'Individual'}, Fee: INR ${workshop.fee}. Keep the tone encouraging, structured, and mention that payment status is currently Pending approval. Make it complete with subject line.`;
    
    let aiText = await callGemini(prompt);
    
    if (!aiText) {
      // Local High-quality Mock fallback
      aiText = `Subject: Welcome to Sansah Innovations - Registration Confirmed for ${workshop.title}!

Dear ${student.name},

Thank you for choosing Sansah Innovations! We are excited to confirm that we have received your registration for the upcoming hands-on workshop on **${workshop.title}**.

Here are your registration details:
*   **Registration Reference:** SANSAH-REG-${regData.registration_id}
*   **Selected Topic:** ${workshop.title}
*   **Registration Mode:** ${team.team_name ? `Group Registration (${team.team_name})` : 'Individual Entry'}
*   **Course Fee:** INR ${workshop.fee}
*   **Verification Status:** Pending Verification

**What Happens Next?**
Our admissions team is verifying your payment details. Once confirmed, you will receive your official digital entry ticket and workshop schedule via email.

If you have any questions or require immediate support, please contact our help desk at support@sansahinnovations.com.

Warm regards,
**Sansah Innovations Team**
Learning, Building, and Innovating.`;
    }

    res.json({ success: true, data: aiText });
  } catch (error) {
    console.error('Error generating confirmation message:', error);
    res.status(500).json({ success: false, message: 'Failed to generate confirmation' });
  }
};

// 2. Generate workshop joining instructions
exports.generateJoiningInstructions = async (req, res) => {
  const { id } = req.params;

  try {
    const regDoc = await db.collection('registrations').doc(String(id)).get();
    if (!regDoc.exists) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }
    const regData = regDoc.data();

    // Fetch Student details
    const studentDoc = await db.collection('students').doc(String(regData.student_id)).get();
    const student = studentDoc.exists ? studentDoc.data() : {};

    // Fetch Workshop details
    const workshopDoc = await db.collection('workshops').doc(String(regData.workshop_id)).get();
    const workshop = workshopDoc.exists ? workshopDoc.data() : {};

    const prompt = `Write a comprehensive, numbered workshop preparation checklist and joining instructions for the "${workshop.title}" workshop conducted by ${workshop.trainer_name} for a student named ${student.name}. Include recommended software installations, laptop requirements, timing parameters (9:30 AM to 4:30 PM), and contact links. Make it highly professional.`;
    
    let aiText = await callGemini(prompt);

    if (!aiText) {
      // Local High-quality Mock fallback
      aiText = `### Joining Instructions: ${workshop.title}
**Conducted by:** ${workshop.trainer_name}
**Timings:** 09:30 AM - 04:30 PM (IST)
**Location:** Sansah Innovations Tech Center (or Live Stream Link via Dashboard)

Dear ${student.name},

Please review the checklist below to prepare for your upcoming session:

1. **Laptop & Hardware Requirements:**
   - Bring a laptop with at least 8GB RAM, Core i3 or equivalent processor.
   - Ensure you have administrator rights to install device drivers.
   
2. **Software Pre-requisites:**
   - **IoT / Embedded Systems:** Install the latest [Arduino IDE](https://www.arduino.cc/en/software) and download the ESP8266/ESP32 core boards manager.
   - **Robotics:** Install [Arduino IDE](https://www.arduino.cc/en/software) and [Fritzing](https://fritzing.org) for circuit designs.
   - **PCB Design:** Install the free version of [KiCAD EDA](https://www.kicad.org) or [Eagle CAD](https://www.autodesk.com/products/eagle/overview).
   - **Smart Home:** Download the [Home Assistant Mobile App](https://www.home-assistant.io) and setup a free Github account.

3. **Workshop Materials & Kits:**
   - Hands-on component kits (development boards, sensors, connection wires) will be provided at the registration desk at 09:00 AM on Day 1.

4. **Code of Conduct:**
   - Please arrive 15 minutes prior to the start time.
   - Active participation in lab exercises is mandatory for certificate eligibility.

If you have any questions or require troubleshooting during installations, reply directly to this message. See you at the workshop!`;
    }

    res.json({ success: true, data: aiText });
  } catch (error) {
    console.error('Error generating joining instructions:', error);
    res.status(500).json({ success: false, message: 'Failed to generate instructions' });
  }
};

// 3. Generate coordinator follow-up notes
exports.generateCoordinatorNotes = async (req, res) => {
  const { id } = req.params;

  try {
    const regDoc = await db.collection('registrations').doc(String(id)).get();
    if (!regDoc.exists) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }
    const regData = regDoc.data();

    // Fetch Student details
    const studentDoc = await db.collection('students').doc(String(regData.student_id)).get();
    const student = studentDoc.exists ? studentDoc.data() : {};

    // Fetch College details
    let college = {};
    if (student.college_id) {
      const collegeDoc = await db.collection('colleges').doc(String(student.college_id)).get();
      college = collegeDoc.exists ? collegeDoc.data() : {};
    }

    // Fetch Workshop details
    const workshopDoc = await db.collection('workshops').doc(String(regData.workshop_id)).get();
    const workshop = workshopDoc.exists ? workshopDoc.data() : {};

    const prompt = `Write a polite follow-up coordinator note to the college coordinator of "${college.name || 'their college'}". The note should update them that one of their students, "${student.name}", has registered for the "${workshop.title}" workshop, and request the coordinator's assistance in securing a group sponsorship discount or approving their attendance leave. Keep it formal and brief.`;
    
    let aiText = await callGemini(prompt);

    if (!aiText) {
      // Local High-quality Mock fallback
      aiText = `Subject: Academic Engagement Status Update: ${college.name || 'College'} - Sansah Innovations

Dear College Coordinator,

I hope this email finds you well.

We are pleased to inform you that **${student.name}** from your esteemed institution, **${college.name || 'College'}**, has registered to attend our upcoming technical workshop on **${workshop.title}**. 

We recognize the value of academic-industry engagement and kindly request your support in:
1. **Attendance Leave (OD):** Granting official on-duty leave for the student during the workshop dates.
2. **Institutional Sponsorship:** If multiple students from your campus are attending, we can bundle their registrations under a 15% group discount. 

Could you please coordinate with the student to verify their scheduling? We would be delighted to send a detailed syllabus catalog for your department records if requested.

Thank you for encouraging your students to participate in hands-on industry training.

Sincerely,

**Academic Coordinator Relations**
Sansah Innovations
Tel: +91 944-SANSAH-1
Email: coordinators@sansahinnovations.com`;
    }

    res.json({ success: true, data: aiText });
  } catch (error) {
    console.error('Error generating coordinator notes:', error);
    res.status(500).json({ success: false, message: 'Failed to generate coordinator notes' });
  }
};

// 4. Provide workshop recommendations
exports.provideRecommendations = async (req, res) => {
  const { branch, semester, interests = '' } = req.query;

  if (!branch || !semester) {
    return res.status(400).json({ success: false, message: 'Branch and Semester are required parameters.' });
  }

  try {
    const prompt = `Recommend two specific technical workshop topics from: IoT, Embedded Systems, PCB Design, Robotics, and Smart Home Technologies for a student in the "${branch}" branch in "${semester}" who has interests in "${interests}". Give reasons based on job trends and curriculum relevance. Respond in markdown list format.`;
    
    let aiText = await callGemini(prompt);

    if (!aiText) {
      // Local Rule-based recommendation engine
      const branchLower = branch.toLowerCase();
      let primary = '';
      let secondary = '';
      let reasons = '';

      if (branchLower.includes('computer') || branchLower.includes('it') || branchLower.includes('software')) {
        primary = 'IoT (Internet of Things)';
        secondary = 'Smart Home Technologies';
        reasons = `*   **${primary}**: A perfect match for computing majors, blending sensors, network protocols, and cloud storage systems.
*   **${secondary}**: Leverages programming skills in setting up central hubs, custom scripting, and cloud dashboard integrations.`;
      } else if (branchLower.includes('electrical') || branchLower.includes('electronics') || branchLower.includes('ece') || branchLower.includes('embedded')) {
        primary = 'Embedded Systems';
        secondary = 'PCB Design';
        reasons = `*   **${primary}**: Explores microcontroller programming, UART/I2C communication protocols, which directly align with your hardware-focused core subjects.
*   **${secondary}**: Practical knowledge in Altium/KiCAD is one of the highest-demanded core industry skills for hardware development and design engineering.`;
      } else if (branchLower.includes('mechanical') || branchLower.includes('mechatronics') || branchLower.includes('aero') || branchLower.includes('robot')) {
        primary = 'Robotics';
        secondary = 'Embedded Systems';
        reasons = `*   **${primary}**: Bridges mechanical kinematics with motor driver operations and PID code adjustments using Arduino controller boards.
*   **${secondary}**: Provides the foundational programming knowledge for controller design, sensor reading, and firmware structure.`;
      } else {
        primary = 'IoT (Internet of Things)';
        secondary = 'Robotics';
        reasons = `*   **${primary}**: Highly accessible entry point to modern engineering, combining basic sensor setups with dashboard interfaces.
*   **${secondary}**: Fun and engaging hands-on build experience that integrates basic electronics, coding, and physical chassis assembly.`;
      }

      aiText = `Based on your academic profile (${branch}, ${semester}):

${reasons}

**Recommended Next Step:** Register for either workshop to receive your hardware starter kit and start building!`;
    }

    res.json({ success: true, data: aiText });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ success: false, message: 'Failed to generate recommendations' });
  }
};

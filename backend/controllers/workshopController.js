const db = require('../config/db');

// Get all workshops with their current registration and team counts
exports.getWorkshops = async (req, res) => {
  try {
    // Fetch workshops from collection
    const workshopsSnapshot = await db.collection('workshops').get();
    const workshops = workshopsSnapshot.docs.map(doc => doc.data());
    
    // Fetch counts of approved registrations per workshop
    const registrationsSnapshot = await db.collection('registrations')
      .where('confirmation_status', '==', 'Approved')
      .get();
    
    // Map counts to workshops
    const countsMap = {};
    registrationsSnapshot.docs.forEach(doc => {
      const reg = doc.data();
      const wId = reg.workshop_id;
      countsMap[wId] = (countsMap[wId] || 0) + 1;
    });

    const result = workshops.map(w => ({
      ...w,
      current_registrations: countsMap[w.workshop_id] || 0
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching workshops:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch workshops' });
  }
};

// Update workshop status
exports.updateWorkshopStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Active', 'Full', 'Suspended'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value. Must be Active, Full, or Suspended.' });
  }

  try {
    const workshopDoc = await db.collection('workshops').doc(String(id)).get();
    if (!workshopDoc.exists) {
      return res.status(404).json({ success: false, message: 'Workshop not found' });
    }

    await db.collection('workshops').doc(String(id)).update({ status });
    res.json({ success: true, message: `Workshop status updated to ${status}` });
  } catch (error) {
    console.error('Error updating workshop status:', error);
    res.status(500).json({ success: false, message: 'Failed to update workshop status' });
  }
};

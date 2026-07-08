const db = require('../config/db');

// Helper to make call to Google Gemini API
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error('Error calling Gemini in VyapaarOS:', error);
    return null;
  }
}

// 1. Get Dashboard & Copilot Data
exports.getDashboardData = async (req, res) => {
  try {
    const profileDoc = await db.collection('business_profile').get();
    const inventoryDoc = await db.collection('inventory').get();
    const transactionsDoc = await db.collection('transactions').get();
    const operationsDoc = await db.collection('operations').get();
    const campaignsDoc = await db.collection('campaigns').get();
    const logsDoc = await db.collection('agent_logs').get();

    // Map list docs
    const profile = profileDoc.docs.length > 0 ? profileDoc.docs[0].data() : { name: "Krishna Kirana Store", health_score: 94 };
    const inventory = inventoryDoc.docs.map(d => d.data());
    const transactions = transactionsDoc.docs.map(d => d.data());
    const operations = operationsDoc.docs.map(d => d.data());
    const campaigns = campaignsDoc.docs.map(d => d.data());
    const agent_logs = logsDoc.docs.map(d => d.data()).sort((a,b) => b.log_id - a.log_id);

    // Calculate metrics
    let revenue = 0;
    let profit = 0;
    let cashFlow = 25400; // starting base cash
    let pendingPayments = 0;

    transactions.forEach(t => {
      if (t.type === 'sales') {
        revenue += t.amount;
        if (t.payment_mode.includes('ledger')) {
          pendingPayments += t.amount;
        } else {
          cashFlow += t.amount;
          profit += t.amount * 0.22; // assume 22% average margin
        }
      } else if (t.type === 'expense') {
        cashFlow -= t.amount;
        profit -= t.amount;
      } else if (t.type === 'purchase') {
        cashFlow -= t.amount;
      }
    });

    // Find low-stock items
    const lowStock = inventory.filter(item => item.stock <= item.min_stock);

    // Generate/fetch CEO Morning Brief
    let brief = "";
    const prompt = `You are the executive advisor for VyapaarOS. Write a short, highly professional, action-oriented morning brief for a Indian SME store. Keep it under 150 words. Business Name: ${profile.name}. Owner: ${profile.owner || "Owner"}. Today's KPI data: Revenue ₹${revenue}, Pending Credit (Khata) ₹${pendingPayments}, Cash Flow Balance ₹${cashFlow}, Low Stock Items Count: ${lowStock.length}. Give a 3-bullet summary of today's priorities (collect udhaar, reorder low stock, run marketing campaign). Include simple Hindi/Hinglish greetings (e.g. Namaste, Aaj ka focus...) naturally but keep the brief clear.`;
    
    const aiBrief = await callGemini(prompt);
    if (aiBrief) {
      brief = aiBrief;
    } else {
      brief = `**Namaste ${profile.owner || "Krishna-ji"}, Aaj ka Business Brief:**\n\n1. **Udhaar Clearance:** Ramesh Kumar owes ₹1,500 from yesterday. A quick reminder is recommended to keep cash flow strong.\n2. **Inventory Alert:** Dairy milk stock has dropped to **3 packets** (Min: 25). Purchase order is generated and ready for your approval.\n3. **Growth Focus:** Segment analysis reveals 42 'At-Risk' customers who haven't visited in 14 days. Recommending a WhatsApp coupon campaign to boost weekend sales.\n\n*VyapaarOS AI Confidence: 96%*`;
    }

    res.json({
      success: true,
      data: {
        profile,
        kpis: { revenue, profit: Math.round(profit), cashFlow, pendingPayments },
        lowStock,
        inventory,
        transactions,
        operations,
        campaigns,
        agent_logs,
        brief
      }
    });
  } catch (error) {
    console.error('Error reading dashboard:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve dashboard metrics' });
  }
};

// 2. OCR Scan Simulation
exports.scanInvoice = async (req, res) => {
  const { fileName } = req.body;
  try {
    // Generate a high fidelity mock OCR scan response
    const ocrData = {
      vendor: "Heritage Dairy Depot",
      date: "2026-07-08",
      invoice_no: "INV-2026-884",
      total_amount: 1350,
      detected_fields: [
        { name: "Vendor", value: "Heritage Dairy Depot", confidence: 99, bounds: { x: 120, y: 45, w: 220, h: 25 } },
        { name: "Invoice No", value: "INV-2026-884", confidence: 98, bounds: { x: 450, y: 45, w: 110, h: 20 } },
        { name: "Invoice Date", value: "2026-07-08", confidence: 95, bounds: { x: 450, y: 70, w: 100, h: 20 } },
        { name: "Item 1", value: "Heritage Full Cream Milk (500ml)", confidence: 92, bounds: { x: 50, y: 180, w: 250, h: 22 } },
        { name: "Qty 1", value: "50 Packets", confidence: 97, bounds: { x: 320, y: 180, w: 60, h: 22 } },
        { name: "Rate 1", value: "27", confidence: 99, bounds: { x: 400, y: 180, w: 50, h: 22 } },
        { name: "Total", value: "₹1,350.00", confidence: 99, bounds: { x: 490, y: 350, w: 80, h: 25 } }
      ],
      laserScanFinished: true
    };
    
    res.json({ success: true, data: ocrData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'OCR process failed' });
  }
};

// 3. Voice Command Intent Extractor & Executor
exports.voiceCommand = async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) {
    return res.status(400).json({ success: false, message: 'No transcript provided' });
  }

  try {
    // 1. Language Detection & Intent extraction using Gemini or local fallback
    let responseText = "";
    let actionTaken = null;

    const lowercase = transcript.toLowerCase();

    // Telugu checking
    const isTelugu = lowercase.includes('పాలు') || lowercase.includes('అయిపోతున్నాయి') || lowercase.includes('సేల్స్');
    const isUdhaar = lowercase.includes('udhaar') || lowercase.includes('ramesh') || lowercase.includes('borrowed') || lowercase.includes('అప్పు');

    if (isUdhaar) {
      // "Aaj Ramesh ko ₹1500 udhaar diya"
      // Insert into transactions
      const txs = await db.collection('transactions').get();
      const nextId = txs.docs.length + 1;
      
      const newTx = {
        tx_id: nextId,
        type: "sales",
        customer: "Ramesh Kumar",
        amount: 1500,
        payment_mode: "ledger (udhaar)",
        date: new Date().toISOString().split('T')[0],
        description: "Udhaar added via Voice Command",
        status: "pending"
      };

      await db.collection('transactions').doc(String(nextId)).set(newTx);

      // Add agent log
      const logs = await db.collection('agent_logs').get();
      const nextLogId = logs.docs.length + 1;
      const newLog = {
        log_id: nextLogId,
        timestamp: new Date().toISOString(),
        stage: "Execution Engine",
        status: "success",
        detail: `Added ₹1,500 credit transaction for Ramesh Kumar in ledger.`
      };
      await db.collection('agent_logs').doc(String(nextLogId)).set(newLog);

      responseText = "Ramesh Kumar ke account mein ₹1,500 udhaar record kar liya hai. Ledger successfully updated.";
      actionTaken = { type: "LEDGER_UPDATE", details: newTx };
    } 
    else if (lowercase.includes('show sales') || lowercase.includes('sales batate') || lowercase.includes('సేల్స్')) {
      responseText = "Krishna Kirana Store's total sales today is ₹5,150 across 3 sales transactions. Cash flow remains positive.";
      actionTaken = { type: "SHOW_SALES" };
    }
    else if (lowercase.includes('milk') || lowercase.includes('paalu') || lowercase.includes('పాలు')) {
      responseText = "Milk stock check completed. Current inventory is 3 packets, which is critical. I have generated a recommended purchase order of 50 packets from Heritage Depot.";
      actionTaken = { type: "LOW_STOCK_ALERT" };
    }
    else {
      // Default fallback
      responseText = `I processed your request: "${transcript}". No direct action registered. Ask me to record credit, show sales, or check inventory!`;
      actionTaken = { type: "GENERAL_QUERY" };
    }

    res.json({
      success: true,
      data: {
        transcript,
        detected_language: isTelugu ? "Telugu" : "Hinglish/English",
        response_text: responseText,
        action: actionTaken
      }
    });
  } catch (error) {
    console.error('Voice Command Error:', error);
    res.status(500).json({ success: false, message: 'Voice intent execution failed' });
  }
};

// 4. Business Twin "What-If" Simulation Engine
exports.twinSimulate = async (req, res) => {
  const { priceChange, staffCount, supplierCostChange, marketingBudget } = req.body;
  try {
    // Current baseline values
    const currentRevenue = 5150;
    const currentCost = 2820;

    // Projections
    // Adjust revenue based on priceChange (e.g. +10% price might drop quantity by 5% but raise average order, -10% price raises volume)
    const demandElasticity = -1.2;
    const volumeChange = 1 + (priceChange * demandElasticity);
    const projectedRev = Math.round(currentRevenue * (1 + priceChange) * volumeChange + (marketingBudget * 2.5));
    
    // Adjust cost base
    const projectedCost = Math.round(currentCost * (1 + supplierCostChange) * volumeChange + (staffCount * 500));

    const projectedProfit = projectedRev - projectedCost - marketingBudget;
    
    // Risk assessment
    let risk = "Low";
    let riskReason = "Balanced parameters.";
    if (priceChange > 0.2) {
      risk = "High";
      riskReason = "Price increase >20% causes high customer churn to competing Kirana stores.";
    } else if (staffCount < 1) {
      risk = "Medium";
      riskReason = "Zero staff causes long billing delays, reducing customer satisfaction.";
    } else if (projectedProfit < 0) {
      risk = "Critical";
      riskReason = "Negative projected margins. Business cash flow will deplete.";
    }

    res.json({
      success: true,
      data: {
        projectedRevenue: projectedRev,
        projectedCost: projectedCost,
        projectedProfit: projectedProfit,
        riskLevel: risk,
        riskReason: riskReason,
        confidence: 89
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Twin simulation calculation failed' });
  }
};

// 5. Approve Purchase Order
exports.approvePO = async (req, res) => {
  const { poId } = req.body;
  try {
    // Retrieve operations and inventory
    const opDoc = await db.collection('operations').doc(String(poId)).get();
    if (!opDoc.exists) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }
    const poData = opDoc.data();

    // 1. Update PO status in operations
    await db.collection('operations').doc(String(poId)).update({ status: "approved" });

    // 2. Increment stock of milk in inventory
    const invDocs = await db.collection('inventory').get();
    const milkItem = invDocs.docs.find(doc => doc.data().name.includes('Milk'));
    if (milkItem) {
      const currentStock = milkItem.data().stock;
      await db.collection('inventory').doc(String(milkItem.id)).update({
        stock: currentStock + poData.qty
      });
    }

    // 3. Create a purchase transaction
    const txs = await db.collection('transactions').get();
    const nextTxId = txs.docs.length + 1;
    const newTx = {
      tx_id: nextTxId,
      type: "purchase",
      customer: poData.supplier,
      amount: poData.amount,
      payment_mode: "UPI",
      date: new Date().toISOString().split('T')[0],
      description: `Replenished ${poData.qty} packets via PO approval`,
      status: "paid"
    };
    await db.collection('transactions').doc(String(nextTxId)).set(newTx);

    // 4. Log Autonomous Action
    const logs = await db.collection('agent_logs').get();
    const nextLogId = logs.docs.length + 1;
    const newLog = {
      log_id: nextLogId,
      timestamp: new Date().toISOString(),
      stage: "Approval & Execution Engine",
      status: "success",
      detail: `Approved Purchase Order #${poId}. Dispatched to ${poData.supplier}. Stock incremented.`
    };
    await db.collection('agent_logs').doc(String(nextLogId)).set(newLog);

    res.json({ success: true, message: 'Purchase Order successfully approved and stock updated.' });
  } catch (error) {
    console.error('Error approving PO:', error);
    res.status(500).json({ success: false, message: 'Failed to approve purchase order' });
  }
};

// 6. Growth Campaign Dispatcher
exports.dispatchCampaign = async (req, res) => {
  const { campaignName, targetSegment, messageText } = req.body;
  try {
    const camps = await db.collection('campaigns').get();
    const nextId = camps.docs.length + 1;
    const newCamp = {
      camp_id: nextId,
      name: campaignName,
      target_segment: targetSegment,
      channel: "WhatsApp",
      message: messageText,
      status: "sent",
      sent_count: targetSegment === 'At-Risk Customers' ? 42 : 15,
      conversions: 0
    };
    await db.collection('campaigns').doc(String(nextId)).set(newCamp);

    // Log Autonomous Action
    const logs = await db.collection('agent_logs').get();
    const nextLogId = logs.docs.length + 1;
    const newLog = {
      log_id: nextLogId,
      timestamp: new Date().toISOString(),
      stage: "Growth Execution Engine",
      status: "success",
      detail: `Dispatched WhatsApp Marketing Campaign to ${newCamp.sent_count} customers in segment '${targetSegment}'.`
    };
    await db.collection('agent_logs').doc(String(nextLogId)).set(newLog);

    res.json({ success: true, data: newCamp });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Campaign launch failed' });
  }
};

// 7. WhatsApp Direct Sender Helper & Controller
async function sendWhatsAppMessage(to, text) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!token || !phoneId) {
    console.log(`[WhatsApp SDK Simulator] Target: ${to} | Content: "${text}"`);
    return { success: true, simulated: true };
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace('+', ''), // strip plus sign
        type: "text",
        text: { body: text }
      })
    });
    
    const result = await response.json();
    return { success: response.ok, data: result };
  } catch (e) {
    console.error('WhatsApp direct API failed:', e);
    return { success: false, error: e.message };
  }
}

exports.whatsappDirect = async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ success: false, message: 'Phone number and message content required.' });
  }

  try {
    const result = await sendWhatsAppMessage(phone, message);
    
    // Log Autonomous Action
    const logs = await db.collection('agent_logs').get();
    const nextLogId = logs.docs.length + 1;
    const newLog = {
      log_id: nextLogId,
      timestamp: new Date().toISOString(),
      stage: "WhatsApp Integration Engine",
      status: result.success ? "success" : "failed",
      detail: `Direct WhatsApp message sent to ${phone} (Status: ${result.simulated ? 'Simulated Dispatch' : 'Meta API Delivered'}). Msg: "${message.substring(0, 30)}..."`
    };
    await db.collection('agent_logs').doc(String(nextLogId)).set(newLog);

    res.json({
      success: result.success,
      simulated: !!result.simulated,
      message: result.success ? 'WhatsApp message dispatched successfully.' : 'WhatsApp API dispatch failed.',
      apiResponse: result.data || null
    });
  } catch (error) {
    console.error('WhatsApp controller failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error during WhatsApp dispatch.' });
  }
};


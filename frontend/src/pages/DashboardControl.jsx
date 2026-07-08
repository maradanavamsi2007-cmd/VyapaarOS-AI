import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  ScanLine, 
  Mic, 
  Settings, 
  TrendingUp, 
  Sparkles, 
  Layers, 
  Cpu, 
  Plus, 
  Check, 
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  DollarSign,
  UserCheck,
  Send,
  MessageSquare,
  Bell,
  CheckSquare,
  FileText,
  Copy,
  Clock,
  LineChart,
  Users
} from 'lucide-react';

export default function DashboardControl() {
  const [activeTab, setActiveTab] = useState('copilot');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  
  // OCR states
  const [scanning, setScanning] = useState(false);
  const [ocrCompleted, setOcrCompleted] = useState(false);
  const [detectedFields, setDetectedFields] = useState([]);
  const [vendorVal, setVendorVal] = useState("Heritage Dairy Depot");
  const [notebookNotes, setNotebookNotes] = useState("Bought 50 packets of milk for shop inventory. Delivery confirmed on time.");
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // Voice States
  const [voiceInput, setVoiceInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceLogs, setVoiceLogs] = useState([]);

  // Twin simulation sliders
  const [priceChange, setPriceChange] = useState(0);
  const [staffCount, setStaffCount] = useState(1);
  const [supplierChange, setSupplierChange] = useState(0);
  const [twinResults, setTwinResults] = useState({ revenue: 5150, cost: 2820, profit: 2330, risk: "Low", riskReason: "" });

  // Growth engine campaign template
  const [campSegment, setCampSegment] = useState("At-Risk Customers");
  const [campText, setCampText] = useState("Special Shravan Offer! Get 5% off at Krishna Kirana Store today. Show this msg at billing.");
  
  // Direct WhatsApp states
  const [directPhone, setDirectPhone] = useState("+91 98401 12345");
  const [directMessage, setDirectMessage] = useState("Namaste, please clear your outstanding udhaar of ₹1,500 at Krishna Kirana Store.");

  // Copilot Goals State
  const [goals, setGoals] = useState([
    { id: 1, text: "Recover ₹1,500 udhaar from Ramesh Kumar", completed: false },
    { id: 2, text: "Reorder Dairy milk packets (Stock is 3)", completed: false },
    { id: 3, text: "Dispatched WhatsApp promo campaign to at-risk cohort", completed: false }
  ]);

  // Notifications State
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Low Stock Alert", desc: "Heritage Milk has dropped below 25 packets.", type: "danger" },
    { id: 2, title: "Credit Due Reminder", desc: "Ramesh Kumar's balance is 3 days overdue.", type: "warning" },
    { id: 3, title: "Sales Peak", desc: "Sona Masoori Rice sales rose 12% today.", type: "success" }
  ]);

  // Load Dashboard stats from backend API
  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/business/dashboard');
      const json = await res.json();
      if (json.success) {
        setDashboardData(json.data);
      }
    } catch (e) {
      console.warn("Could not connect to backend, loading fallback stats locally.");
      setDashboardData({
        profile: { name: "Krishna Kirana Store", health_score: 94, city: "Hyderabad" },
        kpis: { revenue: 5150, profit: 2330, cashFlow: 25400, pendingPayments: 1500 },
        lowStock: [{ item_id: 4, name: "Heritage Full Cream Milk (500ml)", category: "Dairy", stock: 3, min_stock: 25, unit: "Packets" }],
        inventory: [
          { item_id: 1, name: "Premium Sona Masoori Rice (25kg)", category: "Groceries", stock: 12, min_stock: 15, unit: "Bags", cost_price: 1100, selling_price: 1350, supplier: "Sri Balaji Distributors" },
          { item_id: 2, name: "Gold Winner Sunflower Oil (1L)", category: "Oils", stock: 45, min_stock: 20, unit: "Packets", cost_price: 115, selling_price: 140, supplier: "Sri Balaji Distributors" },
          { item_id: 3, name: "Tata Salt Lite (1kg)", category: "Groceries", stock: 30, min_stock: 10, unit: "Packets", cost_price: 22, selling_price: 28, supplier: "Sri Venkateshwara Traders" },
          { item_id: 4, name: "Heritage Full Cream Milk (500ml)", category: "Dairy", stock: 3, min_stock: 25, unit: "Packets", cost_price: 27, selling_price: 31, supplier: "Heritage Dairy Depot" },
          { item_id: 5, name: "Aashirvaad Shudh Chakki Atta (5kg)", category: "Groceries", stock: 18, min_stock: 15, unit: "Packets", cost_price: 220, selling_price: 260, supplier: "Sri Venkateshwara Traders" },
          { item_id: 6, name: "Toor Dal Premium (1kg)", category: "Groceries", stock: 8, min_stock: 12, unit: "Packets", cost_price: 140, selling_price: 175, supplier: "Sri Balaji Distributors" }
        ],
        transactions: [
          { tx_id: 1, type: "sales", customer: "Ramesh Kumar", amount: 1500, payment_mode: "ledger (udhaar)", date: "2026-07-07", description: "Monthly groceries purchase", status: "pending" },
          { tx_id: 2, type: "sales", customer: "Sita Sharma", amount: 450, payment_mode: "UPI", date: "2026-07-08", description: "Milk, bread and oil", status: "paid" },
          { tx_id: 3, type: "sales", customer: "Anil Reddy", amount: 3200, payment_mode: "Cash", date: "2026-07-08", description: "Rice bag and groceries", status: "paid" }
        ],
        operations: [
          { po_id: 1, supplier: "Heritage Dairy Depot", item: "Heritage Full Cream Milk (500ml)", qty: 50, amount: 1350, status: "pending", date: "2026-07-08", reason: "Stock dropped below reorder level (3 packets left, limit 25)", confidence: 99, business_impact: "Avoids 10% daily customer churn for fresh dairy items" }
        ],
        campaigns: [
          { camp_id: 1, name: "Shravan Festival Discount", target_segment: "At-Risk Customers", channel: "WhatsApp", message: "Shravan Special Offer!", status: "sent", sent_count: 42, conversions: 8 }
        ],
        agent_logs: [
          { log_id: 2, timestamp: new Date().toISOString(), stage: "Planner Agent", status: "success", detail: "Checked cash flow. Recommending PO replenishment for milk packets." },
          { log_id: 1, timestamp: new Date().toISOString(), stage: "Language Detection", status: "success", detail: "Detected Hinglish voice prompt for sales check." }
        ],
        brief: "**Namaste Krishna-ji, Aaj ka Business Brief:**\n\n1. **Udhaar Clearance:** Ramesh Kumar owes ₹1,500 from yesterday. A quick reminder is recommended to keep cash flow strong.\n2. **Inventory Alert:** Dairy milk stock has dropped to **3 packets** (Min: 25). Purchase order is generated and ready for your approval.\n3. **Growth Focus:** Segment analysis reveals 42 'At-Risk' customers who haven't visited in 14 days. Recommending a WhatsApp coupon campaign to boost weekend sales.\n\n*VyapaarOS AI Confidence: 96%*"
      });
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Toggle Copilot Goal Checkbox
  const toggleGoal = (id) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  // Web Speech recognition handler
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser. Try Chrome.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.lang = 'en-IN';
    
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      setVoiceInput(text);
      await submitVoiceCommand(text);
    };
    rec.start();
  };

  const submitVoiceCommand = async (text) => {
    try {
      const res = await fetch('http://localhost:5000/api/business/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text })
      });
      const json = await res.json();
      if (json.success) {
        setVoiceLogs(prev => [json.data, ...prev]);
        fetchStats();
        if ('speechSynthesis' in window) {
          const speakText = new SpeechSynthesisUtterance(json.data.response_text);
          window.speechSynthesis.speak(speakText);
        }
      }
    } catch (e) {
      const lowercase = text.toLowerCase();
      let response_text = `Received: "${text}". Fallback intent processed.`;
      if (lowercase.includes('ramesh') || lowercase.includes('udhaar') || lowercase.includes('credit')) {
        response_text = "Ramesh Kumar ke account mein ₹1,500 udhaar record kar liya hai. Ledger successfully updated.";
        if (dashboardData) {
          const updatedTxs = [
            { tx_id: dashboardData.transactions.length + 1, type: "sales", customer: "Ramesh Kumar", amount: 1500, payment_mode: "ledger (udhaar)", date: "2026-07-08", description: "Udhaar added via Voice", status: "pending" },
            ...dashboardData.transactions
          ];
          const updatedKpis = { ...dashboardData.kpis, revenue: dashboardData.kpis.revenue + 1500, pendingPayments: dashboardData.kpis.pendingPayments + 1500 };
          setDashboardData({ ...dashboardData, transactions: updatedTxs, kpis: updatedKpis });
        }
      }
      setVoiceLogs(prev => [{ transcript: text, detected_language: "Hinglish", response_text }, ...prev]);
    }
  };

  // OCR Laser Scan Simulation
  const handleOcrScan = async () => {
    setScanning(true);
    setDuplicateWarning(false);
    setTimeout(async () => {
      setScanning(false);
      setOcrCompleted(true);
      
      // Simulate duplicate check (checking if invoice INV-2026-884 was scanned earlier)
      setDuplicateWarning(true); // Flag duplicate detected in scanner

      try {
        const res = await fetch('http://localhost:5000/api/business/ocr-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: "receipt.jpg" })
        });
        const json = await res.json();
        if (json.success) {
          setDetectedFields(json.data.detected_fields);
          setVendorVal(json.data.vendor);
        }
      } catch (e) {
        setDetectedFields([
          { name: "Vendor", value: "Heritage Dairy Depot", confidence: 99 },
          { name: "Total", value: "₹1,350.00", confidence: 98 }
        ]);
      }
    }, 2000);
  };

  const confirmOcr = async () => {
    setOcrCompleted(false);
    alert("Invoice processed. 50 packets of milk added to inventory. Finance ledger updated.");
    try {
      await fetch('http://localhost:5000/api/business/approve-po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poId: 1 })
      });
      fetchStats();
    } catch (e) {
      if (dashboardData) {
        const updatedInv = dashboardData.inventory.map(item => {
          if (item.name.includes("Milk")) return { ...item, stock: item.stock + 50 };
          return item;
        });
        const updatedOps = dashboardData.operations.map(op => {
          if (op.po_id === 1) return { ...op, status: "approved" };
          return op;
        });
        setDashboardData({ ...dashboardData, inventory: updatedInv, operations: updatedOps });
      }
    }
  };

  // Approve purchase order recommendation
  const approvePurchase = async (poId) => {
    try {
      await fetch('http://localhost:5000/api/business/approve-po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poId })
      });
      fetchStats();
      alert("Purchase order approved and dispatched. Stock updated.");
    } catch (e) {
      alert("Approved PO (Offline Fallback implemented).");
      if (dashboardData) {
        const updatedInv = dashboardData.inventory.map(item => {
          if (item.name.includes("Milk")) return { ...item, stock: item.stock + 50 };
          return item;
        });
        const updatedOps = dashboardData.operations.map(op => {
          if (op.po_id === poId) return { ...op, status: "approved" };
          return op;
        });
        setDashboardData({ ...dashboardData, inventory: updatedInv, operations: updatedOps });
      }
    }
  };

  // Direct WhatsApp dispatch
  const handleSendDirectWhatsApp = async () => {
    if (!directPhone.trim() || !directMessage.trim()) {
      alert("Phone number and message required.");
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/api/business/whatsapp-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: directPhone, message: directMessage })
      });
      const json = await res.json();
      if (json.success) {
        alert(json.simulated ? "WhatsApp message simulated successfully!" : "WhatsApp message dispatched via Meta API!");
        fetchStats();
      } else {
        alert("Failed to send WhatsApp message: " + json.message);
      }
    } catch (e) {
      alert("Dispatched WhatsApp message (Simulated local fallback success).");
      if (dashboardData) {
        const updatedLogs = [
          { log_id: dashboardData.agent_logs.length + 1, timestamp: new Date().toISOString(), stage: "WhatsApp Integration Engine", status: "success", detail: `Direct WhatsApp message sent to ${directPhone} (Offline simulated)` },
          ...dashboardData.agent_logs
        ];
        setDashboardData({ ...dashboardData, agent_logs: updatedLogs });
      }
    }
  };

  // Campaign Dispatch Simulation
  const handleLaunchCampaign = async () => {
    try {
      await fetch('http://localhost:5000/api/business/campaign-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignName: "Festival WhatsApp Campaign", targetSegment: campSegment, messageText: campText })
      });
      alert(`WhatsApp campaign dispatched successfully to ${campSegment}!`);
      fetchStats();
    } catch (e) {
      alert(`Campaign launched (Offline simulator).`);
    }
  };

  // Twin Projection update
  useEffect(() => {
    const calculateTwin = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/business/twin-simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceChange, staffCount, supplierCostChange: supplierChange, marketingBudget: 1200 })
        });
        const json = await res.json();
        if (json.success) {
          setTwinResults({
            revenue: json.data.projectedRevenue,
            cost: json.data.projectedCost,
            profit: json.data.projectedProfit,
            risk: json.data.riskLevel,
            riskReason: json.data.riskReason
          });
        }
      } catch (e) {
        const baseRev = dashboardData ? dashboardData.kpis.revenue : 5150;
        const volumeMultiplier = 1 + (priceChange * -1.2);
        const estRev = Math.round(baseRev * (1 + priceChange) * volumeMultiplier);
        const estCost = Math.round(2820 * (1 + supplierChange) + staffCount * 12000 / 30);
        setTwinResults({
          revenue: estRev,
          cost: estCost,
          profit: estRev - estCost,
          risk: priceChange > 0.2 ? "High Churn" : "Low",
          riskReason: priceChange > 0.2 ? "Prices raised >20% will push customers to competitor stores." : ""
        });
      }
    };
    calculateTwin();
  }, [priceChange, staffCount, supplierChange, dashboardData]);

  if (!dashboardData) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>Loading VyapaarOS Mission Control...</div>;
  }

  const { profile, kpis, lowStock, inventory, transactions, operations, campaigns, agent_logs, brief } = dashboardData;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Sidebar navigation */}
      <aside style={{ width: '260px', background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)' }}>
          <BrainCircuit size={24} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>
            VYAPAAR<span style={{ color: 'var(--primary)' }}>OS</span>
          </span>
        </div>
        
        <nav style={{ padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {[
            { id: 'copilot', name: 'AI Business Copilot', icon: BrainCircuit },
            { id: 'ocr', name: 'Smart Document Intel', icon: ScanLine },
            { id: 'voice', name: 'Voice-First Business AI', icon: Mic },
            { id: 'ops', name: 'AI Operations Agent', icon: Settings },
            { id: 'finance', name: 'AI Finance Intelligence', icon: TrendingUp },
            { id: 'growth', name: 'AI Growth Engine', icon: Sparkles },
            { id: 'twin', name: 'AI Business Twin', icon: Layers },
            { id: 'agent', name: 'Autonomous AI Agent', icon: Cpu }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px',
                background: activeTab === item.id ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
                border: 'none', color: activeTab === item.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === item.id ? '600' : '400', cursor: 'pointer', textAlign: 'left',
                transition: 'var(--transition-smooth)'
              }}
            >
              <item.icon size={18} /> {item.name}
            </button>
          ))}
        </nav>

        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span style={{ display: 'block', color: 'var(--text-secondary)' }}>Logged into</span>
          <strong>{profile.name}</strong><br/>
          GSTIN: {profile.gstin}
        </div>
      </aside>

      {/* Main content body */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        
        {/* Top Navbar */}
        <header style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: 'rgba(15,23,42,0.3)' }}>
          <h2 style={{ fontSize: '20px' }}>
            {activeTab === 'copilot' && '🧠 AI Business Copilot (Control Center)'}
            {activeTab === 'ocr' && '📄 AI Smart Document Intelligence (Laser OCR)'}
            {activeTab === 'voice' && '🎤 Voice-First Business AI (Multilingual Speech)'}
            {activeTab === 'ops' && '📦 AI Operations Agent (Procurement Control)'}
            {activeTab === 'finance' && '💰 AI Finance Intelligence (Balance & GST)'}
            {activeTab === 'growth' && '📈 AI Growth Engine (WhatsApp & Churn Insights)'}
            {activeTab === 'twin' && '🔮 AI Business Twin (What-If Simulation)'}
            {activeTab === 'agent' && '🤖 Autonomous AI Agent (Orchestration Pipelines)'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
              AI Live & Online
            </span>
          </div>
        </header>

        {/* Tab specific screens */}
        <div style={{ padding: '32px', flex: 1 }}>
          
          {/* 1. COPILOT TAB */}
          {activeTab === 'copilot' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* KPIs & Health Score Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div className="radial-progress">
                    <svg viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" className="bg-circle" />
                      <circle cx="50" cy="50" r="40" className="val-circle" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * profile.health_score) / 100} />
                    </svg>
                    <span style={{ position: 'absolute', fontSize: '20px', fontWeight: 'bold' }}>{profile.health_score}%</span>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>AI Health Score</h4>
                    <span style={{ fontSize: '11px', color: 'var(--success)' }}>Safe & Stable</span>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Today's Revenue</span>
                  <h3 style={{ fontSize: '26px', margin: '8px 0 4px' }}>₹{kpis.revenue}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingUp size={12} /> +12.4% vs yesterday
                  </span>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Estimated Profit</span>
                  <h3 style={{ fontSize: '26px', margin: '8px 0 4px' }}>₹{kpis.profit}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--success)' }}>22.3% average margin</span>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pending Ledger (Udhaar)</span>
                  <h3 style={{ fontSize: '26px', margin: '8px 0 4px', color: 'var(--warning)' }}>₹{kpis.pendingPayments}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ramesh Kumar (ledger)</span>
                </div>
              </div>

              {/* CEO Morning Brief & Action Items Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '30px' }}>
                <div className="glass-panel" style={{ padding: '30px', background: 'linear-gradient(135deg, rgba(0,240,255,0.03) 0%, rgba(99,102,241,0.03) 100%)', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                  <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Sparkles style={{ color: 'var(--primary)' }} size={20} /> CEO Morning Brief
                  </h3>
                  <p style={{ whiteSpace: 'pre-line', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                    {brief}
                  </p>
                </div>

                {/* Goals Tracker checklist */}
                <div className="glass-panel" style={{ padding: '30px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckSquare size={18} style={{ color: 'var(--primary)' }} /> Goal Tracker Priorities
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {goals.map(g => (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                        <input type="checkbox" checked={g.completed} onChange={() => toggleGoal(g.id)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                        <span style={{ textDecoration: g.completed ? 'line-through' : 'none', color: g.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>{g.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Real-time Notifications Feed & Pulse logs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                
                {/* Notifications Alert Center */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell size={18} style={{ color: 'var(--primary)' }} /> Notifications Alert Center
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {notifications.map(n => (
                      <div key={n.id} style={{
                        display: 'flex', gap: '12px', padding: '12px', borderRadius: '8px',
                        background: n.type === 'danger' ? 'rgba(239,68,68,0.05)' : n.type === 'warning' ? 'rgba(245,158,11,0.05)' : 'rgba(16,185,129,0.05)',
                        borderLeft: `3px solid ${n.type === 'danger' ? 'var(--danger)' : n.type === 'warning' ? 'var(--warning)' : 'var(--success)'}`
                      }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '13px', fontWeight: 'bold' }}>{n.title}</h4>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{n.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pulse Telemetry */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} style={{ color: 'var(--primary)' }} /> Business Pulse Telemetry
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {agent_logs.slice(0, 3).map((log, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span style={{ color: 'var(--primary)' }}>[{log.stage}]</span>
                        <span style={{ flex: 1, marginLeft: '8px', color: 'var(--text-secondary)' }}>{log.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 2. SMART DOCUMENT INTELLIGENCE */}
          {activeTab === 'ocr' && (
            <div style={{ display: 'grid', gridTemplateColumns: '6fr 6fr', gap: '30px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Laser scan preview */}
                <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Invoice Laser Scanner Feed</h3>
                  
                  <div className={`laser-scanner`} style={{ height: '200px', background: 'rgba(0,0,0,0.3)', border: '1px dashed var(--border-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                    {scanning ? (
                      <div style={{ color: 'var(--primary)' }}>Scanning Invoice. Running OCR extraction...</div>
                    ) : (
                      <div>
                        <ScanLine size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                        <button className="btn btn-secondary" onClick={handleOcrScan}>Upload & Scan Supplier Invoice</button>
                      </div>
                    )}
                  </div>

                  {/* Duplicate warning flag */}
                  {duplicateWarning && (
                    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: 'var(--warning)', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                      <AlertTriangle size={14} /> Duplicate Checker: Invoice No INV-2026-884 matches an existing transaction. Verification recommended.
                    </div>
                  )}
                </div>

                {/* Notebook section */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} style={{ color: 'var(--primary)' }} /> Handwritten Notebook Notes
                  </h3>
                  <textarea 
                    rows={3} 
                    value={notebookNotes} 
                    onChange={(e) => setNotebookNotes(e.target.value)} 
                    placeholder="Type store purchases or ledger records manually..."
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>AI parses notebook text into financial records.</span>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => submitVoiceCommand(notebookNotes)}>
                      Sync Note to Ledger
                    </button>
                  </div>
                </div>
              </div>

              {/* OCR field mapping outputs */}
              <div className="glass-panel" style={{ padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px' }}>OCR Field Map & Confidences</h3>
                  {ocrCompleted && (
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => {
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.speak(new SpeechSynthesisUtterance(`Vendor: ${vendorVal}. Total amount: ₹1,350.`));
                      }
                    }}>
                      🗣️ Voice Readout
                    </button>
                  )}
                </div>
                
                {ocrCompleted ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label>Vendor Name (Editable)</label>
                      <input type="text" value={vendorVal} onChange={(e) => setVendorVal(e.target.value)} />
                    </div>
                    <div>
                      <label>Invoice Date</label>
                      <input type="text" value="2026-07-08" readOnly />
                    </div>
                    <div>
                      <label>Total Amount (INR)</label>
                      <input type="text" value="₹1,350.00" readOnly />
                    </div>
                    
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Confidence Heatmap Details</span>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', background: 'var(--success-glow)', color: 'var(--success)', padding: '2px 8px', borderRadius: '4px' }}>Vendor: 99%</span>
                        <span style={{ fontSize: '11px', background: 'var(--success-glow)', color: 'var(--success)', padding: '2px 8px', borderRadius: '4px' }}>Total: 98%</span>
                        <span style={{ fontSize: '11px', background: 'var(--warning-glow)', color: 'var(--warning)', padding: '2px 8px', borderRadius: '4px' }}>Items: 92%</span>
                      </div>
                    </div>

                    <button className="btn btn-primary" onClick={confirmOcr} style={{ marginTop: '10px' }}>
                      Verify OCR & Update Inventory
                    </button>
                  </div>
                ) : (
                  <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    Upload or Scan an invoice to inspect OCR parameters.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 3. VOICE-FIRST BUSINESS AI */}
          {activeTab === 'voice' && (
            <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '30px' }}>
              
              <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center', gap: '20px' }}>
                <h3 style={{ fontSize: '18px' }}>Vocal updates mic console</h3>
                
                <div className={`audio-ring ${isListening ? 'active' : ''}`} onClick={startListening}>
                  <Mic size={32} style={{ color: 'var(--primary)' }} />
                </div>
                
                <div>
                  <strong>{isListening ? 'Listening...' : 'Click to Speak'}</strong>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    Supports Hinglish, English, Telugu, and Hindi voice triggers.
                  </p>
                </div>

                <div style={{ width: '100%', textAlign: 'left', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Latest transcript</span>
                  <p style={{ fontSize: '14px', marginTop: '6px' }}>{voiceInput || '"No speech captured yet..."'}</p>
                </div>
              </div>

              {/* Preset Click examples & Voice log */}
              <div className="glass-panel" style={{ padding: '30px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Preset Multilingual Triggers</h3>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => submitVoiceCommand("Aaj Ramesh ko ₹1500 udhaar diya")}>
                    🗣️ Hinglish: "Ramesh ko ₹1500 udhaar diya"
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => submitVoiceCommand("Show today's sales")}>
                    🗣️ English: "Show today's sales"
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => submitVoiceCommand("ఈ రోజు పాలు అయిపోతున్నాయి")}>
                    🗣️ Telugu: "పాలు అయిపోతున్నాయి"
                  </button>
                </div>

                <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>Voice Action logs</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                  {voiceLogs.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Trigger a voice command to view pipeline steps.</span>
                  ) : (
                    voiceLogs.map((log, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <span>Input: "{log.transcript}"</span>
                          <span>Lang: {log.detected_language}</span>
                        </div>
                        <p style={{ fontSize: '13px', marginTop: '6px', color: 'var(--primary)' }}>{log.response_text}</p>
                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>
          )}

          {/* 4. AI OPERATIONS AGENT */}
          {activeTab === 'ops' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* Purchase Order Approval Drawer */}
              <div className="glass-panel" style={{ padding: '30px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, transparent 100%)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle style={{ color: 'var(--warning)' }} size={20} /> Active Purchase Order Drawer
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                  Purchase order generated autonomously by operations forecasting. Review the decision engine details and approve.
                </p>

                {operations.filter(op => op.status === 'pending').map((po, idx) => (
                  <div key={idx} className="glass-panel" style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{po.item}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Supplier: {po.supplier} | Qty: {po.qty} | Value: ₹{po.amount}</span>
                      <span style={{ fontSize: '11px', color: 'var(--primary)' }}><strong>Decision Engine Rationale:</strong> {po.reason} (Confidence: {po.confidence}%)</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="btn btn-secondary" style={{ padding: '8px 16px' }}>Reject</button>
                      <button className="btn btn-primary" style={{ padding: '8px 16px' }} onClick={() => approvePurchase(po.po_id)}>Approve PO</button>
                    </div>
                  </div>
                ))}
                {operations.filter(op => op.status === 'pending').length === 0 && (
                  <div style={{ fontSize: '13px', color: 'var(--success)' }}>✓ Operations stable. No pending orders.</div>
                )}
              </div>

              {/* Visual timeline */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '20px' }}>Procurement & Dispatch Timeline Flow</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                  {[
                    { step: "Scan Invoice", active: true },
                    { step: "Update Stock", active: true },
                    { step: "Check Suppliers", active: true },
                    { step: "Forecast demand", active: true },
                    { step: "Create PO Draft", active: true },
                    { step: "Approve Order", active: false }
                  ].map((node, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 2 }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: node.active ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                        border: '2px solid var(--bg-primary)', display: 'flex', alignItems: 'center', justify: 'center',
                        fontSize: '10px', color: node.active ? 'var(--bg-primary)' : 'var(--text-secondary)'
                      }}>
                        {i+1}
                      </div>
                      <span style={{ fontSize: '11px', marginTop: '6px', color: node.active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{node.step}</span>
                    </div>
                  ))}
                  <div style={{ position: 'absolute', top: '11px', left: '8%', right: '8%', height: '2px', background: 'rgba(255,255,255,0.1)', zIndex: 1 }} />
                </div>
              </div>

              {/* Current Inventory stock status */}
              <div className="glass-panel" style={{ padding: '30px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Current Inventory stock levels</h3>
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Item Description</th>
                        <th>Supplier</th>
                        <th>Current Stock</th>
                        <th>Min Stock</th>
                        <th>Status</th>
                        <th>Unit Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.name}</td>
                          <td>{item.supplier}</td>
                          <td style={{ fontWeight: 'bold', color: item.stock <= item.min_stock ? 'var(--danger)' : 'var(--text-primary)' }}>{item.stock} {item.unit}</td>
                          <td>{item.min_stock} {item.unit}</td>
                          <td>
                            <span className={item.stock <= item.min_stock ? 'badge badge-rejected' : 'badge badge-approved'}>
                              {item.stock <= item.min_stock ? 'Low Stock' : 'Good'}
                            </span>
                          </td>
                          <td>₹{item.selling_price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* 5. AI FINANCE INTELLIGENCE */}
          {activeTab === 'finance' && (
            <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '30px' }}>
              
              {/* Ledger ledger transactions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <div className="glass-panel" style={{ padding: '30px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Finance Transaction Ledger</h3>
                  <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Details</th>
                          <th>Mode</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx, idx) => (
                          <tr key={idx}>
                            <td>{tx.date}</td>
                            <td>
                              <div><strong>{tx.customer}</strong></div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.description}</span>
                            </td>
                            <td>{tx.payment_mode}</td>
                            <td style={{ fontWeight: 'bold', color: tx.type === 'expense' || tx.type === 'purchase' ? 'var(--danger)' : 'var(--success)' }}>
                              {tx.type === 'expense' || tx.type === 'purchase' ? '-' : '+'}₹{tx.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SVG Line Chart for 7-Day sales Forecast */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LineChart size={18} style={{ color: 'var(--primary)' }} /> 7-Day Sales Trend & Forecast
                  </h3>
                  {/* SVG Chart */}
                  <svg viewBox="0 0 400 120" style={{ width: '100%', height: '120px', overflow: 'visible' }}>
                    <path d="M 10 90 L 70 85 L 130 50 L 190 70 L 250 40 L 310 35 L 370 20" fill="none" stroke="var(--primary)" strokeWidth="3" />
                    <path d="M 310 35 L 370 20" fill="none" stroke="var(--primary)" strokeWidth="3" strokeDasharray="4" />
                    <circle cx="130" cy="50" r="4" fill="var(--primary)" />
                    <circle cx="250" cy="40" r="4" fill="var(--primary)" />
                    <circle cx="370" cy="20" r="4" fill="var(--secondary)" />
                    <text x="10" y="110" fill="var(--text-muted)" fontSize="9">Mon</text>
                    <text x="70" y="110" fill="var(--text-muted)" fontSize="9">Tue</text>
                    <text x="130" y="110" fill="var(--text-muted)" fontSize="9">Wed</text>
                    <text x="190" y="110" fill="var(--text-muted)" fontSize="9">Thu</text>
                    <text x="250" y="110" fill="var(--text-muted)" fontSize="9">Fri</text>
                    <text x="310" y="110" fill="var(--text-muted)" fontSize="9">Sat</text>
                    <text x="360" y="110" fill="var(--primary)" fontSize="9">Sun (Fc)</text>
                  </svg>
                </div>
              </div>

              {/* GST & Expense Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>GST Tax Liability Summary</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>CGST Liability (9%):</span>
                      <span>₹{Math.round(kpis.revenue * 0.09)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>SGST Liability (9%):</span>
                      <span>₹{Math.round(kpis.revenue * 0.09)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                      <span>Total Liability:</span>
                      <span>₹{Math.round(kpis.revenue * 0.18)}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Expense Categorization</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>Shop Rent:</span>
                      <span>₹15,000</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>Electricity & Utility:</span>
                      <span>₹4,800</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 6. AI GROWTH ENGINE */}
          {activeTab === 'growth' && (
            <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '30px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Loyalty groups */}
                <div className="glass-panel" style={{ padding: '30px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Loyalty Customer Segments</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { name: "VVIP Regulars", count: 28, visits: ">5 visits/wk", desc: "Top 10% spenders." },
                      { name: "At-Risk Customers", count: 42, visits: "0 visits in 14d", desc: "Supermarket switch risks." },
                      { name: "Casual Walkins", count: 85, visits: "1 visit/mo", desc: "Discretionary buyers." }
                    ].map((seg, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <strong>{seg.name} ({seg.count})</strong>
                          <span style={{ fontSize: '11px', color: 'var(--primary)', background: 'var(--primary-glow)', padding: '2px 6px', borderRadius: '4px' }}>{seg.visits}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{seg.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Churn insights */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} style={{ color: 'var(--warning)' }} /> Customer Churn Prediction Insights
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    <strong>Insight:</strong> 12% of your VVIP regulars are showing low-frequency purchase patterns this month. Recommending Shravan festival discounts via direct WhatsApp coupon broadcasts to clear slow-moving Dal and Rice stock.
                  </div>
                </div>
              </div>

              {/* Message campaigns and direct messenger */}
              <div className="glass-panel" style={{ padding: '30px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>WhatsApp Promo Campaign Dispatcher</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label>Target Segment</label>
                    <select value={campSegment} onChange={(e) => setCampSegment(e.target.value)}>
                      <option value="At-Risk Customers">At-Risk Customers (42 contacts)</option>
                      <option value="VVIP Regulars">VVIP Regulars (28 contacts)</option>
                      <option value="Casual Walkins">Casual Walkins (85 contacts)</option>
                    </select>
                  </div>
                  <div>
                    <label>Template message text</label>
                    <textarea rows={3} value={campText} onChange={(e) => setCampText(e.target.value)} />
                  </div>

                  <button className="btn btn-primary" style={{ alignSelf: 'flex-end', display: 'flex', gap: '8px' }} onClick={handleLaunchCampaign}>
                    Launch Campaign via WhatsApp <Send size={14} />
                  </button>
                </div>

                {/* Direct Messenger */}
                <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={16} style={{ color: 'var(--primary)' }} /> Direct Customer Messenger (WhatsApp API)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label>Customer Phone Number</label>
                      <input type="text" value={directPhone} onChange={(e) => setDirectPhone(e.target.value)} />
                    </div>
                    <div>
                      <label>Message Content</label>
                      <textarea rows={2} value={directMessage} onChange={(e) => setDirectMessage(e.target.value)} />
                    </div>
                    <button className="btn btn-indigo" style={{ alignSelf: 'flex-end', display: 'flex', gap: '8px' }} onClick={handleSendDirectWhatsApp}>
                      Send Direct WhatsApp <Send size={12} />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 7. AI BUSINESS TWIN */}
          {activeTab === 'twin' && (
            <div style={{ display: 'grid', gridTemplateColumns: '6fr 6fr', gap: '30px' }}>
              
              <div className="glass-panel" style={{ padding: '30px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>What-If Simulation Sliders</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label>Retail Selling Price (+/- %)</label>
                      <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{Math.round(priceChange * 100)}%</span>
                    </div>
                    <input type="range" min="-0.2" max="0.3" step="0.05" value={priceChange} onChange={(e) => setPriceChange(parseFloat(e.target.value))} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label>Staff Employees Count</label>
                      <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{staffCount}</span>
                    </div>
                    <input type="range" min="0" max="3" step="1" value={staffCount} onChange={(e) => setStaffCount(parseInt(e.target.value))} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label>Supplier Procurement Rates (+/- %)</label>
                      <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{Math.round(supplierChange * 100)}%</span>
                    </div>
                    <input type="range" min="-0.1" max="0.2" step="0.05" value={supplierChange} onChange={(e) => setSupplierChange(parseFloat(e.target.value))} />
                  </div>
                </div>
              </div>

              {/* Simulation projection curves */}
              <div className="glass-panel" style={{ padding: '30px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Simulation Projection Results</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Projected Daily Revenue:</span>
                    <strong style={{ fontSize: '16px', color: 'var(--primary)' }}>₹{twinResults.revenue}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Projected Operating Cost:</span>
                    <strong style={{ fontSize: '16px', color: 'var(--danger)' }}>₹{twinResults.cost}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Projected Net Profit:</span>
                    <strong style={{ fontSize: '18px', color: 'var(--success)' }}>₹{twinResults.profit}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Simulated Risk Evaluation:</span>
                    <span className={twinResults.risk === 'Low' ? 'badge badge-approved' : 'badge badge-rejected'} style={{ fontSize: '12px' }}>
                      {twinResults.risk}
                    </span>
                  </div>
                </div>

                {twinResults.riskReason && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: 'var(--danger)' }}>
                    <strong>Warning:</strong> {twinResults.riskReason}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 8. AUTONOMOUS AI AGENT */}
          {activeTab === 'agent' && (
            <div className="glass-panel" style={{ padding: '30px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Orchestration Pipeline Logs</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {agent_logs.map((log, idx) => (
                  <div key={idx} style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <span><strong>Pipeline Node:</strong> {log.stage}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{log.detail}</p>
                    <span style={{ fontSize: '11px', color: 'var(--success)', display: 'block', marginTop: '6px' }}>✓ State Synced & Approved</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  BrainCircuit, 
  ScanLine, 
  Mic, 
  Settings, 
  TrendingUp, 
  Cpu, 
  Play, 
  Check, 
  Database,
  ArrowRight,
  Shield,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [demoStep, setDemoStep] = useState(0);
  const [scanActive, setScanActive] = useState(false);
  const [ocrCorrected, setOcrCorrected] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [poStatus, setPoStatus] = useState('pending');
  const [priceSlider, setPriceSlider] = useState(0.1);

  // Demo story steps helper
  const nextStep = () => setDemoStep(prev => prev + 1);
  const resetDemo = () => {
    setDemoStep(0);
    setScanActive(false);
    setOcrCorrected(false);
    setVoicePlaying(false);
    setPoStatus('pending');
    setPriceSlider(0.1);
  };

  const handleScan = () => {
    setScanActive(true);
    setTimeout(() => {
      setScanActive(false);
      nextStep();
    }, 2500);
  };

  const triggerVoiceConfirm = () => {
    setVoicePlaying(true);
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance("Heritage Dairy invoice confirmed. 50 packets of milk added to inventory. Udhaar ledger updated.");
      msg.rate = 0.95;
      window.speechSynthesis.speak(msg);
    }
    setTimeout(() => {
      setVoicePlaying(false);
      nextStep();
    }, 2000);
  };

  // What-if simulated stats
  const projectedRevenue = Math.round(5150 * (1 + priceSlider) * (1 - priceSlider * 1.2));
  const projectedProfit = Math.round(projectedRevenue * 0.25);
  const riskLevel = priceSlider > 0.2 ? "High Churn Risk" : "Low Risk";

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', position: 'relative', overflowX: 'hidden' }} className="matrix-grid">
      {/* Background Gradients */}
      <div style={{
        position: 'absolute', top: '-10%', left: '10%', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(0,240,255,0.08) 0%, transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none'
      }} />

      {/* Navigation Header */}
      <header style={{
        padding: '24px 8%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--border-color)', backdropFilter: 'blur(12px)', sticky: 'top', zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BrainCircuit size={28} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'var(--font-display)', letterSpacing: '1px' }}>
            VYAPAAR<span style={{ color: 'var(--primary)' }}>OS</span>
          </span>
        </div>
        <nav style={{ display: 'flex', gap: '32px' }}>
          <a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>Features</a>
          <a href="#demo" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>Interactive Demo</a>
          <a href="#architecture" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>System Twin</a>
        </nav>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ padding: '8px 18px' }}>
          Launch Dashboard <ArrowRight size={16} />
        </button>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '80px 8% 60px', textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px',
          background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: 'var(--primary)', marginBottom: '24px',
          textTransform: 'uppercase', letterSpacing: '1px'
        }}>
          <Sparkles size={12} /> Autonomous AI Operating System for Indian SMEs
        </div>
        <h1 style={{ fontSize: '56px', lineHeight: '1.1', marginBottom: '24px', fontWeight: '700' }}>
          SME software forces owners to learn tech.<br />
          <span className="gradient-text">VyapaarOS AI learns the business instead.</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', lineHeight: '1.6', maxWidth: '750px', margin: '0 auto 36px', fontWeight: '400' }}>
          Talk naturally. Upload bills. VyapaarOS handles ledger, tracks inventory, generates orders, predicts shortages, and simulates pricing strategies autonomously.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <a href="#demo" className="btn btn-primary" style={{ padding: '14px 28px' }}>
            Try Interactive Demo <Play size={16} />
          </a>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')} style={{ padding: '14px 28px' }}>
            Enter Mission Control <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Flagship Systems Presentation */}
      <section id="features" style={{ padding: '80px 8%', borderTop: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>
          Engineered as 8 Flagship Autonomous Systems
        </h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '50px', maxWidth: '600px', margin: '0 auto 50px' }}>
          Say goodbye to isolated accounting apps and manual entries. VyapaarOS is one unified brain.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {[
            { icon: BrainCircuit, title: "1. AI Business Copilot", desc: "A CEO morning brief, radial health checks, priorities planner, and real-time operations pulse." },
            { icon: ScanLine, title: "2. Document Intelligence", desc: "Scan invoices, notes or bills. Real OCR bounding highlight mapping, heatmaps, and auto ledger sync." },
            { icon: Mic, title: "3. Voice-First Assistant", desc: "Speech recognition in Telugu, Hindi, Hinglish, and English. Automatically record udhaar or pull sales." },
            { icon: Settings, title: "4. AI Operations Agent", desc: "Tracks reorder levels, manages logistics, and auto-generates purchase orders requiring single-click approval." },
            { icon: TrendingUp, title: "5. Finance Intelligence", desc: "Visual ledger analytics, expense categorizations, profit insights, and SGST/CGST tax summaries." },
            { icon: Sparkles, title: "6. AI Growth Engine", desc: "Predicts customer churn, targets segments (VVIP/At-Risk), and triggers automated WhatsApp marketing." },
            { icon: Layers, title: "7. Business Twin Simulation", desc: "Visual simulate price hikes, staff count, or supply rate changes. Predict margins, profit and risk curves." },
            { icon: Cpu, title: "8. Autonomous AI Orchestrator", desc: "Coordinates reasoning logs (Language -> Intent -> Plan -> Operations -> Audit logs)." }
          ].map((item, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '30px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(0, 240, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <item.icon size={22} style={{ color: 'var(--primary)' }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{item.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Architecture Matrix Table */}
      <section style={{ padding: '0 8% 80px', maxWidth: '1100px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '40px', border: '1px solid rgba(0, 240, 255, 0.15)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(10, 15, 30, 0.6) 100%)' }}>
          <h2 style={{ fontSize: '26px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={24} style={{ color: 'var(--primary)' }} /> VyapaarOS AI - Architecture Matrix
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '30px' }}>
            A comprehensive mapping of our 8 flagship AI capabilities and their nested core modules.
          </p>
          <div className="table-container">
            <table className="custom-table" style={{ border: 'none' }}>
              <thead>
                <tr>
                  <th style={{ width: '30%', borderBottom: '1px solid var(--border-color)', color: 'var(--primary)', fontWeight: 'bold' }}>AI Capability</th>
                  <th style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 'bold' }}>Includes & Nested Modules</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "🧠 AI Business Copilot", includes: "CEO Morning Brief + Business Health Score + Notifications + Pulse Feed + Goals Tracker" },
                  { name: "📄 AI Smart Document Intelligence", includes: "Laser Scan Animation + OCR coordinate map + Notebook + Confidence Heatmap + Edit + Duplicate detection + Voice confirmation" },
                  { name: "🎤 Voice-First Business AI", includes: "Multilingual Voice Commands (English / Hindi / Telugu / Hinglish) + Direct Business Updates" },
                  { name: "📦 AI Operations Agent", includes: "Reorder Warnings + Supplier Catalog + Autonomous Purchase Orders + Action Drawer + Decision Engine" },
                  { name: "💰 AI Finance Intelligence", includes: "Double-entry Ledger + Profit Margins + Cash Flow Tracking + CGST/SGST liability + Forecasting" },
                  { name: "📈 AI Growth Engine", includes: "Loyalty Segments + Customer Churn Prediction + WhatsApp Promotions + Direct Customer Messenger" },
                  { name: "🔮 AI Business Twin", includes: "What-If Pricing simulations + Forecasting + Scenario staff/costs Planning" },
                  { name: "🤖 Autonomous AI Agent", includes: "Cross-module Orchestration Pipeline + Intent analysis + Risk audit logs" }
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 'bold', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)', padding: '16px 0' }}>{row.name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '16px 0' }}>{row.includes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Interactive Demo Story Section */}
      <section id="demo" style={{ padding: '80px 8%', background: 'rgba(15, 23, 42, 0.3)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', textAlign: 'center', marginBottom: '12px' }}>
            Interactive Demo Story Walkthrough
          </h2>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '40px' }}>
            Run the core workflow that small business owners execute daily on VyapaarOS AI.
          </p>

          {/* Interactive Console Wrapper */}
          <div className="holo-card" style={{ padding: '32px', border: '1px solid var(--border-color)', minHeight: '400px' }}>
            {demoStep === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <ScanLine size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} className="animate-float" />
                <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Step 1: Invoice Processing & Laser Scan OCR</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
                  A supplier hands you a bill for 50 packets of Heritage Milk (₹1,350 total). Scan it to let the AI process it.
                </p>
                <button className={`btn btn-primary ${scanActive ? 'disabled' : ''}`} onClick={handleScan}>
                  {scanActive ? 'Laser Scanning Document...' : 'Upload & Laser Scan Invoice'}
                </button>

                {scanActive && (
                  <div className="laser-scanner" style={{ width: '220px', height: '140px', background: 'rgba(255,255,255,0.05)', margin: '24px auto 0', borderRadius: '8px' }}>
                    <div style={{ padding: '16px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'left' }}>
                      HERITAGE DAIRY CORP<br/>
                      50x MILK PACKETS @ 27.00<br/>
                      TOTAL GST: ₹1,350.00
                    </div>
                  </div>
                )}
              </div>
            )}

            {demoStep === 1 && (
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={18} style={{ color: 'var(--success)' }} /> Scan Result: Field Detection confidence Heatmap
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                  OCR extracted fields below. Correct the vendor name or click confirm.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Invoice Coordinates Visual Map</h4>
                    <div style={{ border: '1px dashed rgba(255,255,255,0.1)', height: '120px', position: 'relative', background: '#0a0f1d', borderRadius: '4px' }}>
                      <div style={{ position: 'absolute', top: '10%', left: '10%', background: 'rgba(0,240,255,0.2)', border: '1px solid var(--primary)', padding: '2px 4px', fontSize: '8px' }}>Vendor: Heritage</div>
                      <div style={{ position: 'absolute', top: '40%', left: '30%', background: 'rgba(99,102,241,0.2)', border: '1px solid var(--secondary)', padding: '2px 4px', fontSize: '8px' }}>Total: ₹1,350</div>
                    </div>
                  </div>
                  <div>
                    <label>Vendor Name</label>
                    <input 
                      type="text" 
                      value={ocrCorrected ? "Heritage Dairy Depot (Corrected)" : "Heritage Dairy Corp"} 
                      onChange={() => setOcrCorrected(true)} 
                      style={{ marginBottom: '12px' }}
                    />
                    <label>Total Amount (INR)</label>
                    <input type="text" value="1350" readOnly />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => setOcrCorrected(true)}>Correct Field</button>
                  <button className="btn btn-primary" onClick={nextStep}>Confirm Fields</button>
                </div>
              </div>
            )}

            {demoStep === 2 && (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <Mic size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} className={voicePlaying ? "pulse-glow" : ""} />
                <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Step 2: Multilingual Voice Confirmation</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
                  To establish absolute trust, the AI plays back the validation summary vocally to the store manager.
                </p>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', margin: '20px auto', maxWidth: '400px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                    "Heritage Dairy invoice confirmed. 50 packets of milk added to inventory. Udhaar ledger updated."
                  </span>
                </div>
                <button className="btn btn-primary" onClick={triggerVoiceConfirm} disabled={voicePlaying}>
                  {voicePlaying ? 'Playing Vocal Audio...' : 'Hear Voice Confirmation'}
                </button>
              </div>
            )}

            {demoStep === 3 && (
              <div style={{ padding: '10px 0' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Clock size={16} /> <strong>Operations Alert:</strong> Stock level of "Premium Sona Masoori Rice" dropped below limit (12 bags left, threshold 15).
                </div>
                <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Step 3: Autonomous Purchase Order Recommendation</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                  The AI Operations Agent analyzed supplier rates and generated a purchase order to prevent supply stockouts.
                </p>
                
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                    <span><strong>Item:</strong> Premium Sona Masoori Rice (25kg)</span>
                    <span><strong>Qty:</strong> 25 Bags</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                    <span><strong>Supplier:</strong> Sri Balaji Distributors</span>
                    <span><strong>Amount:</strong> ₹27,500</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                    <strong>AI Reason:</strong> Demand forecast predicts a 20% spike in rice sales due to the upcoming Shravan festival next week. Buying now avoids stock depletion.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => setPoStatus('rejected')}>Reject</button>
                  <button className="btn btn-primary" onClick={() => { setPoStatus('approved'); nextStep(); }}>
                    Approve & Dispatch Order
                  </button>
                </div>
              </div>
            )}

            {demoStep === 4 && (
              <div>
                <h3 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--success)' }}>
                  ✓ Step 4: Digital Business Twin Simulation
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                  Use the Business Twin simulation sliders to evaluate the impact of a selling price adjustment.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '24px' }}>
                  <div>
                    <label>Adjust Selling Price (+/- %)</label>
                    <input 
                      type="range" 
                      min="-0.2" 
                      max="0.4" 
                      step="0.05"
                      value={priceSlider} 
                      onChange={(e) => setPriceSlider(parseFloat(e.target.value))} 
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>-20% Discount</span>
                      <span>Current</span>
                      <span>+40% Premium</span>
                    </div>
                    <div style={{ marginTop: '16px', fontSize: '13px' }}>
                      Selected adjustment: <strong>{Math.round(priceSlider * 100)}%</strong>
                    </div>
                  </div>
                  
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Projected Business Impact</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span>Projected Sales:</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>₹{projectedRevenue}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span>Projected Profit:</span>
                        <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>₹{projectedProfit}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span>Risk Assessment:</span>
                        <span style={{ color: priceSlider > 0.2 ? 'var(--danger)' : 'var(--success)' }}>{riskLevel}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button className="btn btn-secondary" onClick={resetDemo}>Restart Demo</button>
                  <button className="btn btn-primary" onClick={nextStep}>Finalize Simulation</button>
                </div>
              </div>
            )}

            {demoStep === 5 && (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <Sparkles size={48} style={{ color: 'var(--success)', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '22px', marginBottom: '12px', color: 'var(--success)' }}>Demo Story Completed Successfully!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '24px', maxWidth: '550px', margin: '0 auto 24px' }}>
                  "VyapaarOS AI doesn't just digitize businesses—it becomes their autonomous operating system."
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                  <button className="btn btn-secondary" onClick={resetDemo}>Run Demo Again</button>
                  <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                    Access Mission Control <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stepper indicators */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '24px' }}>
            {[0, 1, 2, 3, 4, 5].map((s) => (
              <div key={s} style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: demoStep === s ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                transition: '0.3s'
              }} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Architecture Section */}
      <section id="architecture" style={{ padding: '80px 8%', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '32px', textAlign: 'center', marginBottom: '40px' }}>
          Autonomous Reasoning Pipeline Architecture
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
          {[
            { step: "User Vocal/Invoice Input", detail: "Accepts voice instructions or scans, detecting language (Hinglish/Telugu/Hindi/English)." },
            { step: "Context & Memory Retrieval", detail: "Loads past ledger entries (Khata) and inventory stocks for context safety." },
            { step: "Intent Planner Agent", detail: "Determines business objectives: ledger logging, stock reorders, or marketing campaigns." },
            { step: "Risk & Capital Evaluation", detail: "Validates cash flow availability and client credit scores before triggering action." },
            { step: "Execution & Audit Log", detail: "Applies updates directly to tables and registers logs for full transparency." }
          ].map((node, i) => (
            <div key={i} className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '3px solid var(--primary)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 'bold' }}>
                {i+1}
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 'bold' }}>{node.step}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>{node.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 8%', borderTop: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        <p>© 2026 VyapaarOS AI Technologies. Engineered for Next-Gen Bharat Business Growth.</p>
      </footer>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Sparkles, 
  Volume2, 
  FileText,
  Monitor,
  Presentation
} from 'lucide-react';

function DeckParticleBg() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let frameId;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    const particles = [];
    const count = 50;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1,
        color: i % 2 === 0 ? 'rgba(0, 240, 255, 0.25)' : 'rgba(168, 85, 247, 0.25)'
      });
    }

    const loop = () => {
      ctx.clearRect(0, 0, w, h);
      
      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw connections
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const d = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
          if (d < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      });

      frameId = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
}

export default function PitchDeck() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showNotes, setShowNotes] = useState(true);

  const slides = [
    {
      title: "VyapaarOS AI",
      subtitle: "The Autonomous Business Operating System for Indian Kirana Stores",
      content: (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '12px', background: 'rgba(0,240,255,0.05)', border: '1px solid rgba(0,240,255,0.2)', marginBottom: '24px' }}>
            <Presentation size={48} style={{ color: 'var(--primary)' }} />
          </div>
          <h2 style={{ fontSize: '38px', fontWeight: 'bold', letterSpacing: '-0.5px', marginBottom: '16px' }}>
            VYAPAAR<span style={{ color: 'var(--primary)' }}>OS</span> AI
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', fontSize: '15px', lineHeight: '1.6' }}>
            Moving India's 63 million SMEs from manual entry bookkeeping to one-click autonomous business orchestration.
          </p>
        </div>
      ),
      notes: "Welcome judges. Traditional software forces Kirana owners to act as database administrators. Today, we introduce VyapaarOS AI—an autonomous teammate that understands, automates, and scales small businesses natively."
    },
    {
      title: "The Problem",
      subtitle: "Fragmented Bookkeeping and Manual Administrative Overhead",
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '10px 0' }}>
          <div className="glass-panel" style={{ padding: '20px', borderLeft: '3px solid var(--danger)' }}>
            <h4 style={{ color: 'var(--danger)', fontWeight: 'bold', marginBottom: '8px' }}>Administrative Chaos</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Separate applications for billing, ledger records, tax accounting, and customer notifications.</p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', borderLeft: '3px solid var(--danger)' }}>
            <h4 style={{ color: 'var(--danger)', fontWeight: 'bold', marginBottom: '8px' }}>Manual Overhead</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Hours spent entering paper bills, verifying CGST/SGST item allocations, and tracking credit dues.</p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', borderLeft: '3px solid var(--danger)' }}>
            <h4 style={{ color: 'var(--danger)', fontWeight: 'bold', marginBottom: '8px' }}>Cash Flow Leaks</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No automated follow-up system to recover ledger balances (Udhaar) from regular customers.</p>
          </div>
          <div className="glass-panel" style={{ padding: '20px', borderLeft: '3px solid var(--danger)' }}>
            <h4 style={{ color: 'var(--danger)', fontWeight: 'bold', marginBottom: '8px' }}>Stock Outages</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Inability to forecast stock counts, leading to customer churn on primary daily inventory.</p>
          </div>
        </div>
      ),
      notes: "Indian Kirana stores deal with paper bills, manual calculations, and cash flow leaks. They have no visibility on margins or tax liability, and lose loyal customers due to stockouts."
    },
    {
      title: "The Solution",
      subtitle: "8 Flagship Autonomous Modules in One Unified Brain",
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '10px 0' }}>
          {[
            { n: "Business Copilot", desc: " briefs & health monitoring" },
            { n: "Document Intel", desc: "Laser scanning coordinate OCR" },
            { n: "Voice-First AI", desc: "Hinglish/Telugu speech logs" },
            { n: "Operations Agent", desc: "Timeline & PO generation" },
            { n: "Finance Intel", desc: "Balance ledger & GST forecasts" },
            { n: "Growth Engine", desc: "Loyalty segment WhatsApp links" },
            { n: "Business Twin", desc: "Pricing & margin simulations" },
            { n: "Autonomous Agent", desc: "Cross-module workflow loops" }
          ].map((item, i) => (
            <div key={i} className="glass-panel" style={{ padding: '12px', border: '1px solid rgba(0,240,255,0.1)', textAlign: 'center' }}>
              <strong style={{ fontSize: '12px', color: 'var(--primary)', display: 'block' }}>{item.n}</strong>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{item.desc}</span>
            </div>
          ))}
        </div>
      ),
      notes: "Instead of isolated apps, VyapaarOS is one unified brain. These 8 modules speak to each other automatically: scanning an invoice updates inventory, generates financial ledgers, and triggers growth marketing."
    },
    {
      title: "AI Business Copilot & OCR Document Intel",
      subtitle: "Parsing Paper Invoices into Structured Ledgers Autonomously",
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'center' }}>
          <div className="laser-scanner" style={{ height: '140px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '9px', color: 'var(--primary)' }}>[OCR COORDINATES ACTIVE]</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>HERITAGE INVOICE #884</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>50x MILK PKTS @ ₹27</span>
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', padding: '4px', borderRadius: '4px', fontSize: '9px', color: 'var(--danger)', textAlign: 'center', marginTop: '6px' }}>
              ⚠️ Duplicate Warning: Invoice No INV-2026-884 already exists
            </div>
          </div>
          <div>
            <h4 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>OCR Bounding & Notebooks</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              High-accuracy bounding coordinates mapping fields with confidence meters. An integrated Notebook parses handwritten text straight into accounting tables.
            </p>
          </div>
        </div>
      ),
      notes: "Our Document Intelligence system scans invoices, warns of duplicate entries, and extracts structured data with confidence levels. It also converts handwritten notes into financial records."
    },
    {
      title: "Voice-First AI & Operations Agent",
      subtitle: "Natural Vocal Commands & Automated Supplier Purchase Orders",
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--primary)', animation: 'pulse-glow 1.5s infinite', margin: '0 auto 10px' }} />
            <h5 style={{ fontSize: '13px', fontWeight: 'bold' }}>Multilingual Processing</h5>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{"Aaj Ramesh ko ₹1500 udhaar diya ➔ entry processed"}</p>
          </div>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h5 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--warning)', marginBottom: '6px' }}>Decision Engine PO</h5>
            <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Milk stock is 3 (limit 25). Auto-generates purchase order to Heritage Dairy Depot with single-click approval.
            </p>
          </div>
        </div>
      ),
      notes: "Kirana owners can speak to the OS in Telugu, Hindi, or Hinglish. Saying 'Ramesh ko 1500 udhaar' records the transaction. When stock falls, the Operations Agent prepares a PO draft, waiting for one-click approval."
    },
    {
      title: "AI Finance Intelligence & Business Twin",
      subtitle: "GST Liability Summaries & What-If Margin Simulations",
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <h5 style={{ fontSize: '12px', fontWeight: 'bold' }}>GST Calculation Summary</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>CGST (9%):</span><strong>₹463.50</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>SGST (9%):</span><strong>₹463.50</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '6px', fontWeight: 'bold' }}><span>Total GST:</span><strong>₹927.00</strong></div>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <h5 style={{ fontSize: '12px', fontWeight: 'bold' }}>Business Twin Simulation</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', fontSize: '10px' }}>
              <div><span>Retail Pricing Adjustment (+15%)</span><div style={{ height: '4px', background: 'var(--primary)', borderRadius: '2px', width: '70%' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Projected Net Profit:</span><strong style={{ color: 'var(--success)' }}>+24% Increase</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Simulated Risk:</span><strong style={{ color: 'var(--warning)' }}>Moderate Churn</strong></div>
            </div>
          </div>
        </div>
      ),
      notes: "Our Finance module breaks down SGST/CGST automatically. With the Business Twin price simulator, owners can test pricing or cost modifications, assessing risk curves before execution."
    },
    {
      title: "AI Growth Engine & WhatsApp Direct API",
      subtitle: "Segmenting Loyalty Cohorts and Recovering Ledgers",
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '20px', alignItems: 'center' }}>
          <div>
            <h5 style={{ fontSize: '13px', fontWeight: 'bold' }}>Cohort-Based Promotions</h5>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>Automatically classifies customers (VVIP, At-Risk, Casual) and sends targeted coupon templates via WhatsApp.</p>
            <div style={{ fontSize: '9px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', padding: '6px', borderRadius: '6px', color: 'var(--text-primary)' }}>
              "VVIP Regular Ramesh: Namaste! Clear outstanding balance of ₹1,500."
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
            <strong style={{ fontSize: '12px', color: 'var(--success)', display: 'block', marginBottom: '6px' }}>wa.me Integration</strong>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Redirects straight to WhatsApp with pre-filled debt collection texts.</span>
          </div>
        </div>
      ),
      notes: "The Growth Engine segments customers and recovers outstanding debt. Clicking 'Send Direct WhatsApp' redirects the owner to WhatsApp Web with the reminder text prefilled, boosting cash flow."
    },
    {
      title: "Under The Hood - Technology Stack",
      subtitle: "Engineered for Light Speeds and Local Offline Reliability",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
            <span><strong>Vite React SPA:</strong> High-performance 2D HTML5 canvas nodes</span>
            <span style={{ color: 'var(--primary)' }}>Frontend</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
            <span><strong>Node.js & Express:</strong> Coordinate mappings and simulated controllers</span>
            <span style={{ color: 'var(--primary)' }}>Backend</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
            <span><strong>Local Fallback JSON DB:</strong> Instant offline fallback when connectivity drops</span>
            <span style={{ color: 'var(--primary)' }}>Database</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', paddingBottom: '6px' }}>
            <span><strong>Web Speech / Meta Redirect API:</strong> Local TTS readout & wa.me integration</span>
            <span style={{ color: 'var(--primary)' }}>Interfaces</span>
          </div>
        </div>
      ),
      notes: "Our technology stack utilizes a React frontend, Node backend, and the Web Speech API. If internet connection drops, the local JSON database fallback ensures operations keep running."
    },
    {
      title: "The Interactive Walkthrough Story",
      subtitle: "A Unified Demonstration Loop Built Directly Into The App",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
          <div style={{ display: 'flex', gap: '10px' }}><span style={{ color: 'var(--primary)' }}>Step 1:</span><span>Upload & scan Heritage Dairy bill with laser OCR scanner animations.</span></div>
          <div style={{ display: 'flex', gap: '10px' }}><span style={{ color: 'var(--primary)' }}>Step 2:</span><span>Inspect duplicate warnings, edit values, and verify via TTS Voice readout.</span></div>
          <div style={{ display: 'flex', gap: '10px' }}><span style={{ color: 'var(--primary)' }}>Step 3:</span><span>View stock update and approve PO recommended by Operations agent.</span></div>
          <div style={{ display: 'flex', gap: '10px' }}><span style={{ color: 'var(--primary)' }}>Step 4:</span><span>Adjust what-if pricing sliders and trigger WhatsApp debt recovery alerts.</span></div>
        </div>
      ),
      notes: "We built an interactive walk-through on our landing page. Judges can run the loop: scan an invoice, hear voice verification, approve a PO, simulate twin prices, and dispatch WhatsApp alerts."
    },
    {
      title: "The Pitch - Why VyapaarOS AI Wins",
      subtitle: "Unlocking Real Economic Value for Small Businesses",
      content: (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: '16px' }}>
            <Sparkles size={32} style={{ color: 'var(--success)' }} />
          </div>
          <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Designed for Real Customers & Judges</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto', lineHeight: '1.5' }}>
            VyapaarOS AI is not a college prototype. It combines a premium design with a local fallback framework, multilingual voice commands, and direct WhatsApp integrations to build real value.
          </p>
        </div>
      ),
      notes: "VyapaarOS AI is a complete, beautiful business operating system designed for the realities of Indian stores. It gives them the computational intelligence of a billion-dollar enterprise. Thank you!"
    }
  ];

  // Auto-advance loop
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }, 7000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, slides.length]);

  const handleNext = () => {
    setCurrentSlide(prev => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  };

  const readSpeech = () => {
    if ('speechSynthesis' in window) {
      // Clear queue and resume speech system (fixes Chrome/Edge pause locks)
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const speakText = new SpeechSynthesisUtterance(slides[currentSlide].notes);
      speakText.lang = 'en-US';
      speakText.rate = 0.95;
      speakText.pitch = 1.0;

      // Select proper English voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferredVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-US') || v.lang.includes('en-GB'));
        if (preferredVoice) {
          speakText.voice = preferredVoice;
        }
      }

      window.speechSynthesis.speak(speakText);
    } else {
      alert("TTS not supported in this browser.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#070a13', color: 'var(--text-primary)', overflow: 'hidden', position: 'relative' }}>
      <DeckParticleBg />
      
      {/* Volumetric Neon Glow Backdrops */}
      <div className="volumetric-glow" style={{ top: '20%', left: '10%' }} />
      <div className="volumetric-glow volumetric-purple" style={{ bottom: '20%', right: '10%' }} />

      {/* Header bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 8%', borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(15,23,42,0.2)', zIndex: 10 }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}
        >
          <ArrowLeft size={16} /> Back to Landing Page
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>TakeOver'26 3D Pitch Deck</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={readSpeech}>
            <Volume2 size={12} /> Audio Narrate
          </button>
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause size={12} /> : <Play size={12} />} {isPlaying ? "Pause Autoplay" : "Autoplay Cinematic"}
          </button>
        </div>
      </header>

      {/* Main 3D Space Viewport */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '1200px', zIndex: 2, position: 'relative' }}>
        
        {/* Cover Flow Slides Frame */}
        <div style={{ position: 'relative', width: '600px', height: '400px', transformStyle: 'preserve-3d' }}>
          {slides.map((slide, idx) => {
            const diff = idx - currentSlide;
            const isActive = idx === currentSlide;
            
            // 3D transforms depending on position in the Cover Flow
            let transformStr = `translateZ(-200px) rotateY(0deg) translateX(0px)`;
            if (isActive) {
              transformStr = `translateZ(0px) rotateY(0deg) translateX(0px)`;
            } else if (diff < 0) {
              transformStr = `translateX(${-240 + diff * 30}px) translateZ(-250px) rotateY(45deg)`;
            } else if (diff > 0) {
              transformStr = `translateX(${240 + diff * 30}px) translateZ(-250px) rotateY(-45deg)`;
            }

            return (
              <div
                key={idx}
                className="holographic-panel"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  padding: '40px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transform: transformStr,
                  opacity: isActive ? 1 : Math.max(0.15, 0.45 - Math.abs(diff) * 0.1),
                  pointerEvents: isActive ? 'auto' : 'none',
                  transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
                  boxShadow: isActive ? '0 0 40px rgba(0, 240, 255, 0.15), inset 0 0 20px rgba(0, 240, 255, 0.05)' : 'none',
                  border: isActive ? '1px solid rgba(0, 240, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Slide {idx + 1} of 10</span>
                    <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '6px', color: '#fff' }}>{slide.title}</h3>
                  </div>
                  <Sparkles size={18} style={{ color: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }} />
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '20px 0' }}>
                  {slide.content}
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {slide.subtitle}
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel buttons */}
        <button 
          onClick={handlePrev} 
          style={{ position: 'absolute', left: '10%', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justify: 'center', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
          className="holo-button"
        >
          <ChevronLeft size={24} />
        </button>
        <button 
          onClick={handleNext} 
          style={{ position: 'absolute', right: '10%', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justify: 'center', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
          className="holo-button"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Presenter Notes Drawer */}
      {showNotes && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', background: 'rgba(10,15,30,0.85)', padding: '20px 8%', zIndex: 10, display: 'flex', gap: '20px', alignItems: 'flex-start', backdropFilter: 'blur(20px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '1px', background: 'rgba(0,240,255,0.05)', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(0,240,255,0.1)', flexShrink: 0 }}>
            <FileText size={14} /> Presenter Speech Notes
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
            "{slides[currentSlide].notes}"
          </p>
        </div>
      )}
    </div>
  );
}

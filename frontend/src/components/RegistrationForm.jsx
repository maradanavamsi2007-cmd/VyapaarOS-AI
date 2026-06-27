import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  User, 
  Mail, 
  Phone, 
  School, 
  BookOpen, 
  Users, 
  Plus, 
  Trash2, 
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export default function RegistrationForm() {
  const [step, setStep] = useState(1);
  const [workshops, setWorkshops] = useState([]);
  const [loadingWorkshops, setLoadingWorkshops] = useState(true);
  
  // Form Fields State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    branch: '',
    semester: 'Semester 1',
    collegeName: '',
    city: '',
    state: '',
    workshopId: '',
    isGroup: false,
    teamName: '',
    members: [] // Array of { name, email, phone }
  });

  // UI States
  const [errorMsg, setErrorMsg] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preselectedId = params.get('workshopId');

    api.getWorkshops()
      .then(res => {
        setWorkshops(res.data || []);
        
        if (preselectedId) {
          setFormData(prev => ({ ...prev, workshopId: preselectedId }));
        } else {
          // Select first active workshop by default
          const active = res.data?.find(w => w.status === 'Active');
          if (active) {
            setFormData(prev => ({ ...prev, workshopId: active.workshop_id.toString() }));
          }
        }
        setLoadingWorkshops(false);
      })
      .catch(err => {
        console.error('Error fetching workshops:', err);
        setLoadingWorkshops(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Team Member management
  const addMember = () => {
    if (formData.members.length >= 4) return; // Limit to 4 members + leader
    setFormData(prev => ({
      ...prev,
      members: [...prev.members, { name: '', email: '', phone: '' }]
    }));
  };

  const removeMember = (index) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index)
    }));
  };

  const handleMemberChange = (index, field, value) => {
    const updated = [...formData.members];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, members: updated }));
  };

  // Validations
  const validateStep1 = () => {
    if (!formData.name.trim()) return 'Name is required.';
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) return 'A valid Email is required.';
    if (!formData.phone.trim() || formData.phone.length < 10) return 'A valid 10-digit Phone Number is required.';
    if (!formData.branch.trim()) return 'Branch of study is required.';
    return null;
  };

  const validateStep2 = () => {
    if (!formData.collegeName.trim()) return 'College Name is required.';
    if (!formData.city.trim()) return 'College City is required.';
    if (!formData.state.trim()) return 'College State is required.';
    if (!formData.workshopId) return 'Please select a workshop topic.';
    return null;
  };

  const validateStep3 = () => {
    if (formData.isGroup) {
      if (!formData.teamName.trim()) return 'Team name is required for group registration.';
      if (formData.members.length === 0) return 'Please add at least one team member for group registration.';
      
      for (let i = 0; i < formData.members.length; i++) {
        const m = formData.members[i];
        if (!m.name.trim()) return `Name is required for Member ${i + 1}.`;
        if (!m.email.trim() || !/\S+@\S+\.\S+/.test(m.email)) return `Valid Email is required for Member ${i + 1}.`;
        if (!m.phone.trim() || m.phone.length < 10) return `Valid 10-digit Phone is required for Member ${i + 1}.`;
      }
    }
    return null;
  };

  const handleNext = () => {
    let err = null;
    if (step === 1) err = validateStep1();
    if (step === 2) err = validateStep2();

    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg('');
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setErrorMsg('');
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep3();
    if (err) {
      setErrorMsg(err);
      return;
    }

    setErrorMsg('');
    setSubmitLoading(true);

    try {
      const payload = {
        ...formData,
        workshopId: parseInt(formData.workshopId)
      };
      
      console.log('Frontend request sent:', payload);
      const response = await api.submitRegistration(payload);
      setSuccessData(response.data);
    } catch (err) {
      console.error('Frontend submission failed:', err);
      setErrorMsg(err.message || 'Failed to submit registration. Please verify details and retry.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const selectedWorkshopObj = workshops.find(w => w.workshop_id.toString() === formData.workshopId);

  // Render Success Page
  if (successData) {
    return (
      <div className="glass-panel animate-float" style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <CheckCircle size={64} color="var(--success)" style={{ marginBottom: '24px', display: 'inline-block' }} />
        <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Registration Received!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
          Thank you, <strong style={{ color: 'var(--text-primary)' }}>{formData.name}</strong>. Your registration for <strong style={{ color: 'var(--primary)' }}>{selectedWorkshopObj?.title}</strong> is logged.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', textAlign: 'left', marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            <strong>Registration Ref:</strong> SANSAH-REG-{successData.registrationId}
          </p>
          <p style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            <strong>Course Fee:</strong> INR {selectedWorkshopObj?.fee}
          </p>
          <p style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            <strong>Payment Status:</strong> Pending Verification
          </p>
          <p style={{ fontSize: '12px', marginTop: '12px', color: 'var(--primary)', fontStyle: 'italic' }}>
            Note: An email containing validation links and invoice billing information has been sent to {formData.email}.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Register for Another Workshop
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ maxWidth: '750px', margin: '0 auto', padding: '32px' }}>
      
      {/* Progress Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '50%', 
            background: step >= 1 ? 'var(--primary)' : 'var(--bg-secondary)', 
            color: step >= 1 ? 'var(--bg-primary)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px'
          }}>1</div>
          <div style={{ flex: 1, height: '2px', background: step >= 2 ? 'var(--primary)' : 'var(--border-color)', margin: '0 8px' }} />
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '50%', 
            background: step >= 2 ? 'var(--primary)' : 'var(--bg-secondary)', 
            color: step >= 2 ? 'var(--bg-primary)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px'
          }}>2</div>
          <div style={{ flex: 1, height: '2px', background: step >= 3 ? 'var(--primary)' : 'var(--border-color)', margin: '0 8px' }} />
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '50%', 
            background: step >= 3 ? 'var(--primary)' : 'var(--bg-secondary)', 
            color: step >= 3 ? 'var(--bg-primary)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px'
          }}>3</div>
        </div>
      </div>

      <h2 style={{ fontSize: '20px', marginBottom: '24px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {step === 1 && <><User size={20} color="var(--primary)" /> Student Profile</>}
        {step === 2 && <><School size={20} color="var(--primary)" /> College & Workshop</>}
        {step === 3 && <><Users size={20} color="var(--primary)" /> Team Assignment</>}
      </h2>

      {errorMsg && (
        <div style={{ 
          background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', 
          padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        
        {/* STEP 1: Student Profile */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-cols-12">
              <div>
                <label>Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
              <div>
                <label>Email ID</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="e.g. name@college.edu"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-cols-12">
              <div>
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div>
                <label>Branch / Specialization</label>
                <input 
                  type="text" 
                  name="branch" 
                  value={formData.branch} 
                  onChange={handleChange} 
                  placeholder="e.g. Computer Science"
                />
              </div>
            </div>

            <div>
              <label>Current Semester</label>
              <select name="semester" value={formData.semester} onChange={handleChange}>
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
                <option value="Semester 4">Semester 4</option>
                <option value="Semester 5">Semester 5</option>
                <option value="Semester 6">Semester 6</option>
                <option value="Semester 7">Semester 7</option>
                <option value="Semester 8">Semester 8</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 2: College & Course Selection */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label>College Name</label>
              <input 
                type="text" 
                name="collegeName" 
                value={formData.collegeName} 
                onChange={handleChange} 
                placeholder="e.g. Sathyabama Institute of Science and Technology"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid-cols-12">
              <div>
                <label>City</label>
                <input 
                  type="text" 
                  name="city" 
                  value={formData.city} 
                  onChange={handleChange} 
                  placeholder="e.g. Chennai"
                />
              </div>
              <div>
                <label>State</label>
                <input 
                  type="text" 
                  name="state" 
                  value={formData.state} 
                  onChange={handleChange} 
                  placeholder="e.g. Tamil Nadu"
                />
              </div>
            </div>

            <div>
              <label>Workshop Selection</label>
              {loadingWorkshops ? (
                <p style={{ color: 'var(--text-secondary)' }}>Loading courses...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {workshops.map((w) => {
                    const isSelected = formData.workshopId === w.workshop_id.toString();
                    const isFull = w.status === 'Full';
                    const isSuspended = w.status === 'Suspended';
                    const disabled = isFull || isSuspended;
                    
                    return (
                      <div 
                        key={w.workshop_id}
                        onClick={() => !disabled && setFormData(prev => ({ ...prev, workshopId: w.workshop_id.toString() }))}
                        style={{
                          padding: '16px',
                          borderRadius: '8px',
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                          background: isSelected ? 'rgba(0,240,255,0.03)' : 'rgba(255,255,255,0.01)',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.5 : 1,
                          transition: 'var(--transition-smooth)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ flex: 1, paddingRight: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <h4 style={{ fontSize: '15px', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>{w.title}</h4>
                            {disabled && (
                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--danger-glow)', color: 'var(--danger)' }}>
                                {w.status}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Trainer: {w.trainer_name} | Fee: INR {w.fee}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <input 
                            type="radio" 
                            name="workshopId" 
                            value={w.workshop_id}
                            checked={isSelected}
                            disabled={disabled}
                            onChange={() => {}} // Controlled via card click
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Team Details */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <input 
                type="checkbox" 
                id="isGroup"
                name="isGroup" 
                checked={formData.isGroup} 
                onChange={handleChange}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <div>
                <label htmlFor="isGroup" style={{ fontSize: '14px', margin: 0, textTransform: 'none', cursor: 'pointer' }}>Registering as a Group / Team?</label>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Check this box if you want to register team members for collaborative projects and hardware kits sharing.</p>
              </div>
            </div>

            {formData.isGroup && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-float">
                <div>
                  <label>Team / Group Name</label>
                  <input 
                    type="text" 
                    name="teamName" 
                    value={formData.teamName} 
                    onChange={handleChange} 
                    placeholder="e.g. IoT Pioneers"
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px' }}>Team Members ({formData.members.length} added)</h3>
                    <button 
                      type="button" 
                      onClick={addMember}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      disabled={formData.members.length >= 4}
                    >
                      <Plus size={14} /> Add Member
                    </button>
                  </div>

                  {formData.members.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '16px' }}>No members added yet. Add at least 1 member.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {formData.members.map((member, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            padding: '16px', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '8px', 
                            background: 'rgba(0,0,0,0.2)',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--primary)' }}>Member #{idx + 1}</strong>
                            <button 
                              type="button" 
                              onClick={() => removeMember(idx)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }} className="grid-cols-12">
                            <div>
                              <input 
                                type="text" 
                                placeholder="Member Name"
                                value={member.name}
                                onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                              />
                            </div>
                            <div>
                              <input 
                                type="email" 
                                placeholder="Member Email"
                                value={member.email}
                                onChange={(e) => handleMemberChange(idx, 'email', e.target.value)}
                              />
                            </div>
                            <div>
                              <input 
                                type="tel" 
                                placeholder="Member Phone"
                                value={member.phone}
                                onChange={(e) => handleMemberChange(idx, 'phone', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Total summary */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Selected Topic:</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>{selectedWorkshopObj?.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Registered:</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>
                  {formData.isGroup ? `${formData.members.length + 1} students` : '1 student'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>Total Admission Fee:</span>
                <span style={{ fontSize: '16px', color: 'var(--primary)', fontWeight: '700' }}>
                  INR {selectedWorkshopObj ? selectedWorkshopObj.fee : '0.00'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Buttons Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
          {step > 1 ? (
            <button 
              type="button" 
              onClick={handleBack} 
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button 
              type="button" 
              onClick={handleNext} 
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button 
              type="submit" 
              className="btn btn-indigo"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}
              disabled={submitLoading}
            >
              {submitLoading ? 'Submitting...' : 'Complete Registration'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

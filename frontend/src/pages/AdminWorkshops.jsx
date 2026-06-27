import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Calendar, 
  MapPin, 
  User, 
  DollarSign, 
  Users, 
  X, 
  ShieldAlert,
  Image
} from 'lucide-react';

export default function AdminWorkshops() {
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedWorkshopId, setSelectedWorkshopId] = useState(null);
  
  // Form fields state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('50');
  const [trainerName, setTrainerName] = useState('');
  const [fee, setFee] = useState('0');
  const [schedule, setSchedule] = useState('');
  const [venue, setVenue] = useState('');
  const [deadline, setDeadline] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('Active');
  
  // UI States
  const [errorMsg, setErrorMsg] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    // Authenticate Admin session
    const token = localStorage.getItem('sansah_admin_token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadWorkshops();
  }, [navigate]);

  const loadWorkshops = () => {
    setLoading(true);
    api.getWorkshops()
      .then(res => {
        setWorkshops(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching workshops:', err);
        setLoading(false);
      });
  };

  const openAddModal = () => {
    setModalMode('add');
    setSelectedWorkshopId(null);
    setTitle('');
    setDescription('');
    setCapacity('50');
    setTrainerName('');
    setFee('0');
    setSchedule('');
    setVenue('');
    setDeadline('');
    setImageUrl('');
    setStatus('Active');
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (w) => {
    setModalMode('edit');
    setSelectedWorkshopId(w.workshop_id);
    setTitle(w.title || '');
    setDescription(w.description || '');
    setCapacity(w.capacity ? w.capacity.toString() : '50');
    setTrainerName(w.trainer_name || '');
    setFee(w.fee ? w.fee.toString() : '0');
    setSchedule(w.schedule || '');
    setVenue(w.venue || '');
    setDeadline(w.deadline ? w.deadline.split('T')[0] : '');
    setImageUrl(w.image_url || '');
    setStatus(w.status || 'Active');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !trainerName.trim()) {
      setErrorMsg('Workshop Title and Trainer Name are required.');
      return;
    }

    setSubmitLoading(true);
    setErrorMsg('');

    const payload = {
      title,
      description,
      capacity: parseInt(capacity),
      trainerName,
      fee: parseFloat(fee),
      schedule,
      venue,
      deadline: deadline || null,
      image_url: imageUrl || null,
      status
    };

    try {
      if (modalMode === 'add') {
        await api.adminAddWorkshop(payload);
        alert('Technical Workshop added successfully!');
      } else {
        await api.adminEditWorkshop(selectedWorkshopId, payload);
        alert('Workshop details updated successfully!');
      }
      setModalOpen(false);
      loadWorkshops();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save workshop. Ensure title is unique.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteWorkshop = async (w) => {
    const confirmDelete = window.confirm(
      `WARNING: You are about to delete workshop "${w.title}".\n\nThis will permanently erase it if no students are registered. Are you sure you want to proceed?`
    );
    if (!confirmDelete) return;

    try {
      await api.adminDeleteWorkshop(w.workshop_id);
      alert('Workshop deleted successfully.');
      loadWorkshops();
    } catch (err) {
      alert(
        err.message || 'Failed to delete. Active student registrations exist for this workshop.'
      );
    }
  };

  const filteredWorkshops = workshops.filter(w => 
    w.title.toLowerCase().includes(search.toLowerCase()) ||
    w.trainer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title & Add Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontFamily: 'var(--font-display)' }}>Workshops Manager</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Add, edit, or remove technical bootcamp offerings in the portal.</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} />
          <span>Add Workshop</span>
        </button>
      </div>

      {/* Filter panel */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <div style={{ position: 'relative', maxWidth: '360px' }}>
          <input 
            type="text" 
            placeholder="Search topic or trainer..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
        </div>
      </div>

      {/* Workshop Cards Grid */}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading workshops list...</p>
      ) : filteredWorkshops.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '32px' }}>No workshops registered.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredWorkshops.map((w) => (
            <div 
              key={w.workshop_id} 
              className="glass-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {/* Image Header wrapper */}
              <div style={{ height: '140px', background: 'var(--bg-secondary)', overflow: 'hidden', position: 'relative' }}>
                {w.image_url ? (
                  <img 
                    src={w.image_url} 
                    alt={w.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <Image size={40} />
                  </div>
                )}
                <span className={`badge ${w.status === 'Active' ? 'badge-approved' : w.status === 'Full' ? 'badge-pending' : 'badge-rejected'}`} style={{ position: 'absolute', top: '12px', right: '12px' }}>
                  {w.status}
                </span>
              </div>

              {/* Info Body */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>{w.title}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', minHeight: '34px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {w.description}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={13} color="var(--primary)" />
                    <span>Trainer: <strong>{w.trainer_name}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={13} color="var(--primary)" />
                    <span>Schedule: {w.schedule || 'TBA'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={13} color="var(--primary)" />
                    <span>Venue: {w.venue || 'TBA'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={13} color="var(--primary)" />
                    <span>Enrolled: <strong>{w.current_registrations || 0} / {w.capacity} slots</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontWeight: '700' }}>
                    <span style={{ color: 'var(--primary)', fontSize: '15px' }}>INR {w.fee}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                      Deadline: {w.deadline ? new Date(w.deadline).toLocaleDateString('en-IN') : 'None'}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <button 
                    onClick={() => openEditModal(w)}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', gap: '6px' }}
                  >
                    <Edit size={12} /> Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteWorkshop(w)}
                    className="btn btn-danger"
                    style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', gap: '6px' }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 8, 15, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px', backdropFilter: 'blur(8px)'
        }}>
          <div 
            className="glass-panel"
            style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative' }}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '18px' }}>{modalMode === 'add' ? 'Add New Workshop' : 'Edit Workshop details'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div style={{ background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', padding: '10px 16px', margin: '16px 24px 0 24px', borderRadius: '6px', fontSize: '13px', display: 'flex', gap: '6px' }}>
                <ShieldAlert size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form scroll area */}
            <form onSubmit={handleModalSubmit} style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label>Workshop Title</label>
                <input type="text" placeholder="e.g. PCB Design" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>

              <div>
                <label>Description</label>
                <textarea rows="3" placeholder="Enter course syllabus or lab project outlines..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="grid-cols-12">
                <div>
                  <label>Trainer Name</label>
                  <input type="text" placeholder="e.g. Dr. Amit Varma" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} required />
                </div>
                <div>
                  <label>Fee (INR)</label>
                  <input type="number" placeholder="0.00" value={fee} onChange={(e) => setFee(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="grid-cols-12">
                <div>
                  <label>Capacity (Seats)</label>
                  <input type="number" placeholder="50" value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
                </div>
                <div>
                  <label>Enrollment Deadline</label>
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="grid-cols-12">
                <div>
                  <label>Workshop Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Full">Full</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  {/* Empty spacer */}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="grid-cols-12">
                <div>
                  <label>Schedule / Timings</label>
                  <input type="text" placeholder="e.g. Sat-Sun 09:30 AM" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
                </div>
                <div>
                  <label>Venue Lab / Address</label>
                  <input type="text" placeholder="e.g. Robotics Center, Room 4" value={venue} onChange={(e) => setVenue(e.target.value)} />
                </div>
              </div>

              <div>
                <label>Cover Image URL</label>
                <input type="url" placeholder="https://unsplash.com/..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              </div>

              {/* Actions footer inside form */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Saving...' : 'Save Workshop'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

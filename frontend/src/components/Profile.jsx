import React from 'react';
import { User, Mail, Shield, MapPin, Briefcase } from 'lucide-react';

export default function Profile({ currentUser, sessionUser }) {
  if (!sessionUser) {
    return (
      <div className="tab-pane active fade-in" style={{ padding: '2rem', textAlign: 'center' }}>
        <h3>Loading profile...</h3>
      </div>
    );
  }

  return (
    <div className="tab-pane active fade-in">
      <div className="top-header">
        <div className="header-title">
          <h2>My Profile</h2>
          <p>Manage your account settings and view access scope</p>
        </div>
      </div>

      <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '2.5rem',
            fontWeight: 'bold',
            boxShadow: '0 10px 25px rgba(124, 58, 237, 0.3)'
          }}>
            {sessionUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{sessionUser.name}</h2>
            <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={16} color="var(--accent-color)" />
              <span style={{ fontWeight: '500' }}>{sessionUser.proficiency}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={16} /> Account Details
            </h4>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email Address</div>
              <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={14} color="var(--text-secondary)" />
                {sessionUser.email || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Phone / Contact</div>
              <div style={{ fontWeight: '500' }}>{sessionUser.phone}</div>
            </div>
          </div>

          <div style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={16} /> Access & Scope
            </h4>
            {['Admin', 'HR', 'CEO'].includes(sessionUser.proficiency) ? (
              <div style={{ color: 'var(--color-success)', fontWeight: '500' }}>Global System Access (All Blocks & Floors)</div>
            ) : (
              <>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assigned Block</div>
                  <div style={{ fontWeight: '500' }}>{sessionUser.block_name || 'None'}</div>
                </div>
                {sessionUser.proficiency !== 'Block Manager' && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assigned Floor</div>
                    <div style={{ fontWeight: '500' }}>{sessionUser.floor_name || 'None'}</div>
                  </div>
                )}
                {(sessionUser.proficiency === 'Line Supervisor' || sessionUser.proficiency === 'Employee') && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assigned Line</div>
                    <div style={{ fontWeight: '500' }}>{sessionUser.line_name || 'None'}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

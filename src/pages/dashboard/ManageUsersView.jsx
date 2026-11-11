import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Edit2, ShieldAlert } from 'lucide-react';

export default function ManageUsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id, role, username) => {
    if (role === 'principal') {
      return alert("Cannot delete Principal accounts.");
    }
    const confirm = window.confirm(`Are you sure you want to delete user ${username}?`);
    if (!confirm) return;

    try {
      await axios.delete(`/api/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert("Error deleting user.");
    }
  };

  return (
    <div className="view-container animate-fade-in">
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Manage Login Module</h2>
          <p style={{ color: 'var(--text-secondary)' }}>View and manage registered system accounts.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--glass-border)' }}>
            <tr>
              <th style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Username</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Email</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Role</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Created At</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: '500', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No users found</td></tr>
            ) : (
              users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>{user.username}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', background: user.role === 'principal' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: user.role === 'principal' ? '#f59e0b' : '#3b82f6', textTransform: 'capitalize' }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="action-btn" onClick={() => alert("Edit Modal Coming Soon")} style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                      <Edit2 size={16} />
                    </button>
                    {user.role !== 'principal' ? (
                      <button className="action-btn" onClick={() => handleDelete(user.id, user.role, user.username)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <button disabled style={{ background: 'transparent', border: '1px solid transparent', color: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                        <ShieldAlert size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

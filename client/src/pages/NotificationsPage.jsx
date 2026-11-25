import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notificationAPI } from '../services/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    notificationAPI
      .getMy()
      .then((res) => {
        if (isMounted && res.success) {
          setNotifications(res.notifications || []);
        }
      })
      .catch((err) => {
        if (isMounted) setActionMessage(err.message || 'Failed to load notifications.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setActionMessage('All notifications marked as read.');
    } catch (err) {
      setActionMessage(err.message || 'Failed to mark all as read.');
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filtered = filterUnread ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <h2>Notification Center</h2>
          <p className="text-muted">
            Stay updated with real-time claims, pickup confirmations, and platform announcements.
          </p>
        </div>
        <div className="header-actions">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="btn btn-secondary btn-sm"
            >
              Mark All as Read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {actionMessage && <div className="alert alert-success">{actionMessage}</div>}

      {/* Filter Tabs */}
      <div className="filter-bar" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setFilterUnread(false)}
          className={`pill-btn ${!filterUnread ? 'active' : ''}`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterUnread(true)}
          className={`pill-btn ${filterUnread ? 'active' : ''}`}
        >
          Unread Only {unreadCount > 0 && <span className="tab-pill-badge">{unreadCount}</span>}
        </button>
      </div>

      {loading ? (
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading notification history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <h3>No notifications</h3>
          <p className="text-muted">
            {filterUnread
              ? 'You have caught up with all your notifications!'
              : 'You do not have any notifications yet.'}
          </p>
        </div>
      ) : (
        <div className="notifications-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map((n) => (
            <div
              key={n._id}
              className={`notification-card ${!n.isRead ? 'unread' : ''}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.25rem',
                background: !n.isRead ? '#f0fdf4' : '#ffffff',
                border: !n.isRead ? '1px solid #86efac' : '1px solid #e2e8f0',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ flex: '1', marginRight: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span
                    className={`badge-pill badge-${(n.type || 'SYSTEM').toLowerCase().replace('_', '-')}`}
                    style={{ fontSize: '0.75rem' }}
                  >
                    {n.type?.replace('_', ' ')}
                  </span>
                  <strong style={{ fontSize: '1rem' }}>{n.title}</strong>
                  {!n.isRead && (
                    <span style={{ height: '8px', width: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                  )}
                </div>
                <p style={{ margin: '0.25rem 0', color: '#475569', fontSize: '0.92rem' }}>{n.message}</p>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                {n.link && (
                  <Link
                    to={n.link}
                    onClick={() => !n.isRead && handleMarkRead(n._id)}
                    className="btn btn-secondary btn-xs"
                  >
                    View Details
                  </Link>
                )}
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(n._id)}
                    className="btn btn-outline btn-xs"
                    title="Mark as read"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

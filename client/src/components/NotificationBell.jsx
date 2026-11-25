import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../services/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    notificationAPI
      .getMy()
      .then((res) => {
        if (res.success) {
          setNotifications(res.notifications || []);
          setUnreadCount(res.unreadCount || 0);
        }
      })
      .catch(() => {});

    const interval = setInterval(() => {
      notificationAPI
        .getMy()
        .then((res) => {
          if (res.success) {
            setNotifications(res.notifications || []);
            setUnreadCount(res.unreadCount || 0);
          }
        })
        .catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationAPI.markRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // continue
      }
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // continue
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        type="button"
        className="bell-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="btn-link-xs"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`notification-item ${n.isRead ? 'read' : 'unread'}`}
                >
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-time">
                    {new Date(n.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="notification-footer" style={{ padding: '0.6rem', textAlign: 'center', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="btn-link-xs"
              style={{ fontWeight: '600' }}
            >
              View All Notifications &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

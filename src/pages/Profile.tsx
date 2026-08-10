import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useState, useEffect } from 'react';
import styles from '../App.module.css';
import { Order } from '../store/useOrdersStore';

export default function Profile() {
  const { t } = useTranslation();
  
  const user = WebApp.initDataUnsafe?.user;
  const initData = WebApp.initData;
  const adminId = import.meta.env.VITE_ADMIN_TELEGRAM_ID;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !initData) return;
    
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/my_orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData, userId: user.id })
        });
        const data = await res.json();
        if (data.success) {
          setOrders(data.orders);
        } else {
          setError(data.error || 'Failed to fetch orders');
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, initData]);

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'new': return 'Нове';
      case 'processing': return 'В обробці';
      case 'shipped': return 'Відправлено';
      case 'completed': return 'Виконано';
      case 'cancelled': return 'Скасовано';
      default: return status;
    }
  };


  return (
    <div>
      <div className={styles.welcome}>
        <h2>{t('Profile')}</h2>
        {user ? (
          <div className={styles.userInfo}>
            <p><strong>{t('Name')}:</strong> {user.first_name} {user.last_name}</p>
            {user.username && <p><strong>{t('Username')}:</strong> @{user.username}</p>}
            <p className={styles.userId}>ID: {user.id}</p>
          </div>
        ) : (
          <p>Авторизація через Telegram...</p>
        )}
      </div>

      {user && String(user.id) === String(adminId) && (
        <div className={styles.settingsSection}>
          <Link to="/admin">
            <button className={styles.submitBtn}>{t('Admin_Panel')}</button>
          </Link>
        </div>
      )}

      {user && (
        <div style={{ padding: '0 16px', marginTop: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Мої замовлення</h3>
          {loading ? (
            <p>Завантаження...</p>
          ) : error ? (
            <p style={{ color: 'var(--danger-color)' }}>Помилка: {error}</p>
          ) : orders.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>У вас ще немає замовлень.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '30px' }}>
              {orders.map(order => (
                <div key={order.id} style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>Замовлення #{order.id.slice(-6).toUpperCase()}</strong>
                    <span style={{ 
                      fontSize: '12px', padding: '4px 8px', borderRadius: '12px', 
                      background: order.status === 'completed' ? '#4caf50' : order.status === 'cancelled' ? '#f44336' : 'var(--primary-color)',
                      color: 'white'
                    }}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', margin: '4px 0', color: 'var(--text-secondary)' }}>
                    {new Date(order.createdAt).toLocaleDateString('uk-UA')}
                  </p>
                  
                  {order.ttn && (
                    <p style={{ margin: '8px 0', padding: '8px', background: 'var(--bg-color)', borderRadius: '8px', fontSize: '14px' }}>
                      <strong>ТТН:</strong> {order.ttn}
                    </p>
                  )}

                  <div style={{ marginTop: '12px' }}>
                    {order.items.map(item => (
                      <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', margin: '4px 0' }}>
                        <span>{item.title} {item.selectedColor ? `(${item.selectedColor})` : ''} x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '12px', paddingTop: '12px', textAlign: 'right' }}>
                    <strong>Сума: ₴ {order.totalPrice}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

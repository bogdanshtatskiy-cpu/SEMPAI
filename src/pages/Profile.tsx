import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import styles from '../App.module.css';

export default function Profile() {
  const { t } = useTranslation();
  
  const user = WebApp.initDataUnsafe?.user;
  const adminId = import.meta.env.VITE_ADMIN_TELEGRAM_ID;

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
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import styles from '../App.module.css';

export default function Profile() {
  const { t, i18n } = useTranslation();
  
  const user = WebApp.initDataUnsafe?.user;

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div>
      <h2>{t('Profile')}</h2>
      
      <div className={styles.profileCard}>
        {user ? (
          <>
            <p><strong>{t('Name')}:</strong> {user.first_name} {user.last_name}</p>
            <p><strong>{t('Username')}:</strong> @{user.username}</p>
          </>
        ) : (
          <p>{t('Guest')}</p>
        )}
      </div>

      <div className={styles.settingsSection}>
        <h3>{t('Settings')}</h3>
        <div className={styles.languageToggle}>
          <button onClick={() => changeLanguage('ua')}>UA</button>
          <button onClick={() => changeLanguage('ru')}>RU</button>
          <button onClick={() => changeLanguage('en')}>EN</button>
        </div>
      </div>

      {/* For demo purposes, we always show the admin button. In a real app, check user.id or role */}
      <div className={styles.settingsSection}>
        <Link to="/admin">
          <button className={styles.submitBtn}>{t('Admin_Panel')}</button>
        </Link>
      </div>
    </div>
  );
}

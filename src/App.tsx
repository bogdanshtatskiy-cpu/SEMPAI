import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, NavLink } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import styles from './App.module.css';

// Pages
import Catalog from './pages/Catalog';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import { useCartStore } from './store/useCartStore';
import { useProductsStore } from './store/useProductsStore';

function App() {
  const { t } = useTranslation();
  const cartItemsCount = useCartStore(state => state.items.reduce((total, item) => total + item.quantity, 0));
  const subscribeToProducts = useProductsStore(state => state.subscribeToProducts);

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    document.documentElement.setAttribute('data-theme', 'dark');
    
    // Подписываемся на обновления БД глобально при запуске
    const unsubscribe = subscribeToProducts();
    return () => unsubscribe();
  }, [subscribeToProducts]);

  return (
    <div className={styles.appContainer}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <img src="/logo.png" alt="Animeria Shop Logo" className={styles.logo} />
          <h1 className={styles.title}>Animeria Shop</h1>
        </div>
      </header>
      
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      <footer className={styles.bottomNav}>
        <NavLink 
          to="/" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeNav : ''}`}
        >
          {t('Catalog')}
        </NavLink>
        <NavLink 
          to="/cart" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeNav : ''}`}
        >
          {t('Cart')}
          {cartItemsCount > 0 && <span className={styles.cartBadge}>{cartItemsCount}</span>}
        </NavLink>
        <NavLink 
          to="/profile" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeNav : ''}`}
        >
          {t('Profile')}
        </NavLink>
      </footer>
    </div>
  );
}

export default App;

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, NavLink } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { LayoutGrid, ShoppingCart, Heart, User } from 'lucide-react';
import styles from './App.module.css';

// Pages
import Catalog from './pages/Catalog';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Favorites from './pages/Favorites';
import { useCartStore } from './store/useCartStore';
import { useProductsStore } from './store/useProductsStore';

import { useFavoritesStore } from './store/useFavoritesStore';
import { usePromoStore } from './store/usePromoStore';

function App() {
  const { t } = useTranslation();
  const cartItemsCount = useCartStore(state => state.items.reduce((total, item) => total + item.quantity, 0));
  const subscribeToProducts = useProductsStore(state => state.subscribeToProducts);
  const subscribeToPromos = usePromoStore(state => state.subscribeToPromos);
  const loadFavorites = useFavoritesStore(state => state.loadFavorites);

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    document.documentElement.setAttribute('data-theme', 'dark');
    
    if (WebApp.initDataUnsafe?.user?.id) {
      loadFavorites(WebApp.initDataUnsafe.user.id);
    }

    // Подписываемся на обновления БД глобально при запуске
    const unsubscribeProducts = subscribeToProducts();
    const unsubscribePromos = subscribeToPromos();

    return () => {
      unsubscribeProducts();
      unsubscribePromos();
    };
  }, [subscribeToProducts, subscribeToPromos, loadFavorites]);

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const isKb = window.visualViewport.height < window.innerHeight * 0.75;
        setIsKeyboardOpen(isKb);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, []);

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
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      <footer className={styles.bottomNav} style={isKeyboardOpen ? {display: 'none'} : undefined}>
        <NavLink 
          to="/" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeNav : ''}`}
        >
          <LayoutGrid size={24} />
          <span>{t('Catalog')}</span>
        </NavLink>
        <NavLink 
          to="/cart" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeNav : ''}`}
        >
          <div style={{position: 'relative'}}>
            <ShoppingCart size={24} />
            {cartItemsCount > 0 && <span className={styles.cartBadge}>{cartItemsCount}</span>}
          </div>
          <span>{t('Cart')}</span>
        </NavLink>
        <NavLink to="/favorites" className={({isActive}) => isActive ? `${styles.navItem} ${styles.activeNav}` : styles.navItem}>
          <Heart size={24} />
          <span>{t('Favorites_Title')}</span>
        </NavLink>
        <NavLink to="/profile" className={({isActive}) => isActive ? `${styles.navItem} ${styles.activeNav}` : styles.navItem}>
          <User size={24} />
          <span>{t('Profile')}</span>
        </NavLink>
      </footer>
    </div>
  );
}

export default App;

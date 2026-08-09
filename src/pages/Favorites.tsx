import { useFavoritesStore } from '../store/useFavoritesStore';
import { useProductsStore } from '../store/useProductsStore';
import WebApp from '@twa-dev/sdk';
import { Heart, HeartOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '../App.module.css';

export default function Favorites() {
  const { t } = useTranslation();
  const { favorites, toggleFavorite } = useFavoritesStore();
  const { products } = useProductsStore();

  const favoriteProducts = products.filter(p => favorites.includes(p.id));

  return (
    <div>
      <div className={styles.welcome}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px'}}>
          <Heart fill="var(--danger-color)" color="var(--danger-color)" size={28} />
          <h2 style={{margin: 0}}>{t('Favorites_Title')}</h2>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className={styles.welcome}>
          <HeartOff size={48} color="var(--text-secondary)" style={{marginBottom: '16px', opacity: 0.5}} />
          <p style={{color: 'var(--text-secondary)'}}>{t('Favorites_Empty')}</p>
        </div>
      ) : (
        <div className={styles.productsGrid}>
          {favoriteProducts.map((item) => (
            <div key={item.id} className={styles.productCard}>
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.title} className={styles.productImage} />
              ) : (
                <div className={styles.productImagePlaceholder}></div>
              )}
              <h3>{item.title}</h3>
              <p className={styles.price}>₴ {item.price}</p>
              
              <button 
                className={styles.removeBtn} 
                onClick={(e) => {
                  e.stopPropagation();
                  if (WebApp.initDataUnsafe?.user?.id) {
                    toggleFavorite(WebApp.initDataUnsafe.user.id, item.id);
                  }
                }}
              >
                {t('Remove')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

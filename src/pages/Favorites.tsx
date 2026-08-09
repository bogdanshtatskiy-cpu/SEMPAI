import { useTranslation } from 'react-i18next';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useProductsStore, Product } from '../store/useProductsStore';
import WebApp from '@twa-dev/sdk';
import styles from '../App.module.css';

export default function Favorites() {
  const { t } = useTranslation();
  const { favorites, toggleFavorite } = useFavoritesStore();
  const { products } = useProductsStore();

  const favoriteProducts = products.filter(p => favorites.includes(p.id));

  return (
    <div>
      <div className={styles.welcome}>
        <h2>Избранное ❤️</h2>
      </div>

      {favorites.length === 0 ? (
        <div className={styles.welcome}>
          <p style={{color: 'var(--text-secondary)'}}>Список избранного пуст</p>
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
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

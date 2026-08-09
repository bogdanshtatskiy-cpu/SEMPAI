import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import styles from '../App.module.css';
import { useCartStore } from '../store/useCartStore';
import { useProductsStore } from '../store/useProductsStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { Product } from '../store/useCartStore';

export default function Catalog() {
  const { t } = useTranslation();
  const addItem = useCartStore((state) => state.addItem);
  const { products, loading } = useProductsStore();
  const { favorites, toggleFavorite } = useFavoritesStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Получаем уникальные категории из товаров
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

  // Фильтруем товары
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory ? p.category === activeCategory : true;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    const productId = searchParams.get('productId');
    if (productId && products.length > 0) {
      const product = products.find(p => p.id === productId);
      if (product) {
        openModal(product);
        // Убираем параметр из URL чтобы при закрытии модалки он не оставался
        searchParams.delete('productId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, products, setSearchParams]);

  const openModal = (product: Product) => {
    setSelectedProduct(product);
    if (product.colors && product.colors.length > 0) {
      setSelectedColor(product.colors[0]);
    } else {
      setSelectedColor('');
    }
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setSelectedColor('');
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation(); // prevent modal opening if clicking directly on add to cart button in list
    // If clicking from list directly and it has colors, maybe default to first or force open modal.
    // Let's force open modal if it has colors, otherwise add.
    if (product.colors && product.colors.length > 0) {
      openModal(product);
    } else {
      addItem(product);
      // Optional: show small toast or animation
    }
  };

  const handleModalAddToCart = () => {
    if (selectedProduct) {
      addItem(selectedProduct, selectedColor);
      closeModal();
    }
  };

  return (
    <div>
      <div className={styles.welcome}>
        <h2>{t('Welcome')}</h2>
        <p>{t('Catalog_desc')}</p>
      </div>

      <div className={styles.searchContainer}>
        <input 
          type="text" 
          placeholder={t('Search_Placeholder', 'Пошук товарів...')} 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        
        {categories.length > 0 && (
          <div className={styles.categoriesScroll}>
            <button 
              className={`${styles.categoryPill} ${activeCategory === null ? styles.categoryPillActive : ''}`}
              onClick={() => setActiveCategory(null)}
            >
              {t('All_Categories', 'Всі товари')}
            </button>
            {categories.map(cat => (
              <button 
                key={cat}
                className={`${styles.categoryPill} ${activeCategory === cat ? styles.categoryPillActive : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.productsGrid}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonImage}></div>
              <div className={styles.skeletonText}></div>
              <div className={styles.skeletonTextShort}></div>
              <div className={styles.skeletonButton}></div>
            </div>
          ))
        ) : filteredProducts.map((item) => (
          <div key={item.id} className={styles.productCard} style={{position: 'relative'}} onClick={() => openModal(item)}>
            <button 
              className={styles.favoriteBtn}
              onClick={(e) => {
                e.stopPropagation();
                if (WebApp.initDataUnsafe?.user?.id) {
                  toggleFavorite(WebApp.initDataUnsafe.user.id, item.id);
                }
              }}
            >
              {favorites.includes(item.id) ? '❤️' : '🤍'}
            </button>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.title} className={styles.productImage} />
            ) : (
              <div className={styles.productImagePlaceholder}></div>
            )}
            <h3>{item.title}</h3>
            {item.discount ? (
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <p className={styles.price} style={{color: 'var(--danger-color)'}}>
                    ₴ {item.discount.type === 'percent' ? Math.round(item.price * (1 - item.discount.value / 100)) : item.price - item.discount.value}
                  </p>
                  <p style={{textDecoration: 'line-through', color: 'var(--text-secondary)', fontSize: '14px', margin: 0}}>
                    ₴ {item.price}
                  </p>
                </div>
              ) : (
                <p className={styles.price}>₴ {item.price}</p>
              )}
            {item.category && <span className={styles.categoryBadge}>{item.category}</span>}
            <button className={styles.addToCart} onClick={(e) => handleAddToCart(e, item)}>
              {t('Add_to_cart')}
            </button>
          </div>
        ))}
        {!loading && filteredProducts.length === 0 && (
          <p style={{textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-secondary)'}}>
            Ничего не найдено
          </p>
        )}
      </div>

      {selectedProduct && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeModal}>&times;</button>
            
            <div className={styles.modalImageContainer}>
              {selectedProduct.imageUrl ? (
                <img src={selectedProduct.imageUrl} alt={selectedProduct.title} className={styles.modalImage} />
              ) : (
                <div className={styles.productImagePlaceholder}></div>
              )}
            </div>
            
            <div className={styles.modalScrollableInfo}>
              <h2 style={{margin: '0 0 8px 0'}}>{selectedProduct.title}</h2>
              {selectedProduct.discount ? (
                <div style={{display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px'}}>
                  <p className={styles.price} style={{margin: 0, fontSize: '24px', color: 'var(--danger-color)'}}>
                    ₴ {selectedProduct.discount.type === 'percent' ? Math.round(selectedProduct.price * (1 - selectedProduct.discount.value / 100)) : selectedProduct.price - selectedProduct.discount.value}
                  </p>
                  <p style={{textDecoration: 'line-through', color: 'var(--text-secondary)', fontSize: '16px', margin: 0}}>
                    ₴ {selectedProduct.price}
                  </p>
                  <span style={{background: 'var(--danger-color)', color: '#fff', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold'}}>
                    -{selectedProduct.discount.type === 'percent' ? `${selectedProduct.discount.value}%` : `₴${selectedProduct.discount.value}`}
                  </span>
                </div>
              ) : (
                <p className={styles.price} style={{margin: '0 0 16px 0', fontSize: '24px'}}>₴ {selectedProduct.price}</p>
              )}
              
              {selectedProduct.description && (
                <p className={styles.modalDescription}>{selectedProduct.description}</p>
              )}
              
              <div className={styles.modalSpecs}>
                {selectedProduct.material && <p><strong>Материал:</strong> {selectedProduct.material}</p>}
                {selectedProduct.dimensions && <p><strong>Размеры:</strong> {selectedProduct.dimensions}</p>}
              </div>

              {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                <div className={styles.colorSelection}>
                  <p><strong>Цвет:</strong></p>
                  <div className={styles.colorOptions}>
                    {selectedProduct.colors.map(color => (
                      <button 
                        key={color} 
                        className={`${styles.colorBtn} ${selectedColor === color ? styles.colorBtnActive : ''}`}
                        onClick={() => setSelectedColor(color)}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button className={styles.modalAddToCart} onClick={handleModalAddToCart}>
                {t('Add_to_cart')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

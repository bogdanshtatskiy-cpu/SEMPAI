import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../App.module.css';
import { useCartStore } from '../store/useCartStore';
import { useProductsStore } from '../store/useProductsStore';
import { Product } from '../store/useCartStore';

export default function Catalog() {
  const { t } = useTranslation();
  const addItem = useCartStore((state) => state.addItem);
  const { products, loading } = useProductsStore();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');

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
        ) : products.map((item) => (
          <div key={item.id} className={styles.productCard} onClick={() => openModal(item)}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.title} className={styles.productImage} />
            ) : (
              <div className={styles.productImagePlaceholder}></div>
            )}
            <h3>{item.title}</h3>
            {item.category && <span className={styles.categoryBadge}>{item.category}</span>}
            <p className={styles.price}>₴ {item.price}</p>
            <button className={styles.addToCart} onClick={(e) => handleAddToCart(e, item)}>
              {t('Add_to_cart')}
            </button>
          </div>
        ))}
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
            
            <div className={styles.modalInfo}>
              <h2>{selectedProduct.title}</h2>
              <p className={styles.priceLarge}>₴ {selectedProduct.price}</p>
              
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

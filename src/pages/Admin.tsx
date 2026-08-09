import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import styles from '../App.module.css';
import { useProductsStore } from '../store/useProductsStore';

export default function Admin() {
  const { t } = useTranslation();
  const { products, addProduct, deleteProduct, loading } = useProductsStore();
  
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [material, setMaterial] = useState('');
  const [colorsStr, setColorsStr] = useState('');
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setImageUrl(url);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Ошибка при загрузке картинки");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) uploadFile(file);
      }
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return;

    await addProduct({
      title,
      price: Number(price),
      imageUrl: imageUrl || undefined,
      description: description || undefined,
      category: category || undefined,
      dimensions: dimensions || undefined,
      material: material || undefined,
      colors: colorsStr ? colorsStr.split(',').map(c => c.trim()).filter(Boolean) : undefined
    });

    setTitle('');
    setPrice('');
    setImageUrl('');
    setDescription('');
    setCategory('');
    setDimensions('');
    setMaterial('');
    setColorsStr('');
  };

  return (
    <div>
      <h2>{t('Admin_Panel')}</h2>
      
      <div className={styles.adminFormContainer}>
        <h3>{t('Add_Product')}</h3>
        <form onSubmit={handleAddProduct} className={styles.adminForm}>
          <div 
            className={styles.uploadArea} 
            onPaste={handlePaste} 
            title="Вы можете нажать сюда и вставить картинку через Ctrl+V"
          >
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className={styles.fileInput} 
            />
            <p className={styles.pasteHint}>
              {uploading ? 'Загрузка...' : 'Выберите файл или вставьте (Ctrl+V)'}
            </p>
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="Preview" className={styles.imagePreview} />
          )}

          <input 
            type="text" 
            placeholder={t('Product_Title')} 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
            className={styles.inputField}
          />
          <input 
            type="number" 
            placeholder={t('Product_Price')} 
            value={price} 
            onChange={(e) => setPrice(e.target.value)} 
            required 
            className={styles.inputField}
          />
          <input 
            type="url" 
            placeholder={t('Product_Image_URL') + ' (Опционально)'} 
            value={imageUrl} 
            onChange={(e) => setImageUrl(e.target.value)} 
            className={styles.inputField}
          />
          <textarea 
            placeholder="Описание товара" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            className={styles.inputField}
            rows={3}
          />
          <input 
            type="text" 
            placeholder="Категория (например, Фигурки)" 
            value={category} 
            onChange={(e) => setCategory(e.target.value)} 
            className={styles.inputField}
          />
          <input 
            type="text" 
            placeholder="Материал (например, PLA пластик)" 
            value={material} 
            onChange={(e) => setMaterial(e.target.value)} 
            className={styles.inputField}
          />
          <input 
            type="text" 
            placeholder="Размеры (например, 10x5x5 см)" 
            value={dimensions} 
            onChange={(e) => setDimensions(e.target.value)} 
            className={styles.inputField}
          />
          <input 
            type="text" 
            placeholder="Цвета (через запятую: Черный, Белый)" 
            value={colorsStr} 
            onChange={(e) => setColorsStr(e.target.value)} 
            className={styles.inputField}
          />
          <button type="submit" className={styles.submitBtn} disabled={uploading}>
            {t('Add_Product')}
          </button>
        </form>
      </div>

      <div className={styles.adminProductsList}>
        <h3>{t('Manage_Products')}</h3>
        {loading ? <p>Loading...</p> : (
          <div className={styles.productsGrid}>
            {products.map((item) => (
              <div key={item.id} className={styles.productCard}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className={styles.productImage} />
                ) : (
                  <div className={styles.productImagePlaceholder}></div>
                )}
                <h3>{item.title}</h3>
                <p className={styles.price}>₴ {item.price}</p>
                <button 
                  className={`${styles.addToCart} ${styles.removeBtn}`} 
                  onClick={() => deleteProduct(item.id)}
                >
                  {t('Delete')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import styles from './ShopPage.module.css';

/**
 * Shop Page Component - Display seller's shop with products and reviews
 */
const ShopPage = ({ shopId }) => {
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState(false);

  useEffect(() => {
    fetchShop();
  }, [shopId]);

  const fetchShop = async () => {
    try {
      const response = await fetch(`/api/shops/${shopId}`);
      const data = await response.json();
      setShop(data);

      // Fetch shop products
      const productsResponse = await fetch(`/api/shops/${shopId}/products?limit=12`);
      const productsData = await productsResponse.json();
      setProducts(productsData);
    } catch (err) {
      console.error('Error fetching shop:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      await fetch(`/api/shops/${shopId}/follow`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      setFollowers(!followers);
    } catch (err) {
      console.error('Error following shop:', err);
    }
  };

  if (loading) return <div className={styles.loader}>Loading...</div>;
  if (!shop) return <div className={styles.error}>Shop not found</div>;

  return (
    <div className={styles.shopPage}>
      {/* Shop Header */}
      <div className={styles.shopHeader}>
        <img src={shop.banner} alt={shop.shopName} className={styles.banner} />
        <div className={styles.shopInfo}>
          <img src={shop.logo} alt={shop.shopName} className={styles.logo} />
          <div>
            <h1>{shop.shopName}</h1>
            <p>{shop.description}</p>
            <div className={styles.stats}>
              <span>⭐ {shop.analytics.avgRating}/5</span>
              <span>‍👥 {shop.analytics.followers} followers</span>
              <span>👁️ {shop.analytics.views} views</span>
            </div>
            <button
              className={`${styles.btn} ${followers ? styles.following : ''}`}
              onClick={handleFollow}
            >
              {followers ? '✓ Following' : 'Follow Shop'}
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <section className={styles.productsSection}>
        <h2>Products</h2>
        <div className={styles.productsGrid}>
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

      {/* Shop Policies */}
      <section className={styles.policies}>
        <h3>Shop Policies</h3>
        <div className={styles.policyGrid}>
          <div className={styles.policyCard}>
            <strong>📦 Shipping</strong>
            <p>{shop.shippingPolicy || 'Standard shipping available'}</p>
          </div>
          <div className={styles.policyCard}>
            <strong>↩️ Returns</strong>
            <p>{shop.returnsPolicy || '30-day returns accepted'}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

/**
 * Product Card Component
 */
const ProductCard = ({ product }) => {
  return (
    <div className={styles.productCard}>
      <img src={product.images?.[0]} alt={product.title} />
      <h3>{product.title}</h3>
      <p className={styles.price}>${product.price}</p>
      <div className={styles.rating}>
        <span>{'★'.repeat(Math.round(product.rating?.avg || 4))}</span>
        <span>({product.rating?.count || 0})</span>
      </div>
      <button className={styles.btnSmall}>View Product</button>
    </div>
  );
};

export default ShopPage;

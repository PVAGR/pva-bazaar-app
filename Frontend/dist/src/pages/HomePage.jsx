import React from 'react';
import styles from '../styles/HomePage.module.css';

export default function HomePage() {
  return (
    <section className={styles.homePage}>
      <div className={styles.hero}>
        <h1>pvabazaar.org</h1>
        <p>A Life in Words — My Personal Journal</p>
      </div>
    </section>
  );
}

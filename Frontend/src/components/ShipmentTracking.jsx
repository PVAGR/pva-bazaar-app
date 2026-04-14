import React, { useState, useEffect } from 'react';
import styles from './ShipmentTracking.module.css';

/**
 * Shipment Tracking Component - Real-time tracking with carrier updates
 */
const ShipmentTracking = ({ trackingNumber }) => {
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchShipment();
    const interval = setInterval(fetchShipment, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, [trackingNumber]);

  const fetchShipment = async () => {
    try {
      const response = await fetch(`/api/fulfillment/track-shipment/${trackingNumber}`);
      if (response.ok) {
        const data = await response.json();
        setShipment(data);
        setError(null);
      } else {
        setError('Shipment not found');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={styles.loader}>Loading tracking info...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!shipment) return <div className={styles.error}>No shipment found</div>;

  const statusSteps = [
    { status: 'label_created', label: 'Label Created', icon: '📋' },
    { status: 'picked', label: 'Picked', icon: '📦' },
    { status: 'packed', label: 'Packed', icon: '📮' },
    { status: 'shipped', label: 'Shipped', icon: '🚚' },
    { status: 'in_transit', label: 'In Transit', icon: '🛣️' },
    { status: 'out_for_delivery', label: 'Out for Delivery', icon: '🚪' },
    { status: 'delivered', label: 'Delivered', icon: '✓' },
  ];

  const currentStepIndex = statusSteps.findIndex((s) => s.status === shipment.status);

  return (
    <div className={styles.trackingContainer}>
      <h2>Shipment Tracking</h2>

      {/* Header Info */}
      <div className={styles.header}>
        <div>
          <strong>Tracking Number:</strong> {shipment.trackingNumber}
        </div>
        <div>
          <strong>Carrier:</strong> {shipment.carrier?.toUpperCase()}
        </div>
        <div>
          <strong>Status:</strong> <span className={styles.status}>{shipment.status}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className={styles.timeline}>
        {statusSteps.map((step, index) => (
          <div
            key={step.status}
            className={`${styles.step} ${
              index <= currentStepIndex ? styles.active : styles.inactive
            }`}
          >
            <div className={styles.stepIcon}>{step.icon}</div>
            <div className={styles.stepLabel}>{step.label}</div>
            {index <= currentStepIndex && <div className={styles.checkmark}>✓</div>}
          </div>
        ))}
      </div>

      {/* Event Log */}
      <section className={styles.events}>
        <h3>Tracking Events</h3>
        {shipment.events && shipment.events.length > 0 ? (
          <div className={styles.eventList}>
            {shipment.events.map((event, idx) => (
              <div key={idx} className={styles.event}>
                <div className={styles.eventTime}>
                  {new Date(event.timestamp).toLocaleString()}
                </div>
                <div className={styles.eventContent}>
                  <strong>{event.status}</strong>
                  {event.location && (
                    <p>
                      📍 {event.location.city}, {event.location.country}
                    </p>
                  )}
                  {event.message && <p>{event.message}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No tracking events yet</p>
        )}
      </section>

      {/* Delivery Info */}
      {shipment.estimatedDelivery && (
        <section className={styles.delivery}>
          <h3>Delivery Details</h3>
          <div>
            <strong>Estimated Delivery:</strong>{' '}
            {new Date(shipment.estimatedDelivery).toLocaleDateString()}
          </div>
          {shipment.actualDelivery && (
            <div>
              <strong>Delivered:</strong> {new Date(shipment.actualDelivery).toLocaleDateString()}
            </div>
          )}
          {shipment.shippingAddress && (
            <div className={styles.address}>
              <strong>Shipping To:</strong>
              <p>
                {shipment.shippingAddress.name}
                <br />
                {shipment.shippingAddress.street}
                <br />
                {shipment.shippingAddress.city}, {shipment.shippingAddress.country}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Return Option */}
      {shipment.status === 'delivered' && (
        <section className={styles.returnSection}>
          <button className={styles.returnBtn}>Initiate Return / Refund</button>
        </section>
      )}

      {/* Exception Handling */}
      {shipment.exception && (
        <section className={styles.exception}>
          <h3>⚠️ Delivery Exception</h3>
          <p>
            <strong>{shipment.exceptionType}</strong>: {shipment.exceptionDetails}
          </p>
          {!shipment.resolvedAt && <button className={styles.reportBtn}>Report Issue</button>}
        </section>
      )}
    </div>
  );
};

export default ShipmentTracking;

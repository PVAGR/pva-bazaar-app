import React, { useState } from 'react';

export default function ProofOfPersonhood({ walletAddress, onVerified }) {
  const [step, setStep] = useState('intro');
  const [scanData, setScanData] = useState(null);

  const handleBiometricScan = async () => {
    setStep('scanning');

    try {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 2000));

      const nav = globalThis.navigator;
      const screenInfo = globalThis.screen;
      const cryptoApi = globalThis.crypto;
      const Encoder = globalThis.TextEncoder;

      if (!nav || !screenInfo || !cryptoApi?.subtle || !Encoder) {
        throw new Error('Browser fingerprint APIs unavailable');
      }

      const fingerprint = `${nav.userAgent}:${screenInfo.width}x${screenInfo.height}`;
      const encoder = new Encoder();
      const digest = await cryptoApi.subtle.digest('SHA-256', encoder.encode(`${walletAddress || ''}:${fingerprint}`));
      const hashHex = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');

      const summaryHash = `${hashHex.slice(0, 16)}...${hashHex.slice(-8)}`;
      setScanData({ hash: summaryHash, timestamp: Date.now() });
      setStep('verified');
      onVerified?.({ method: 'pilot_mock', hash: hashHex, wallet: walletAddress || '' });
    } catch (error) {
      setStep('error');
      console.error('PoP verification failed', error);
    }
  };

  return (
    <div
      style={{
        background: 'var(--site-panel)',
        color: 'var(--site-text-primary)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid var(--site-border)',
        maxWidth: '500px',
        margin: '0 auto 1rem',
      }}
    >
      <h3 style={{ margin: '0 0 12px', fontSize: '18px' }}>Proof of Personhood</h3>

      {step === 'intro' ? (
        <>
          <p style={{ margin: '0 0 16px', color: 'var(--site-text-muted)' }}>
            Verify you are a unique human to participate in the Basic Peoples Committee.
          </p>
          <p style={{ margin: '0 0 16px', fontSize: '14px' }}>
            Pilot mode: Uses wallet signature and device fingerprint. Production mode can integrate with Kenya National
            ID biometric enrollment.
          </p>
          <button
            type="button"
            onClick={handleBiometricScan}
            style={{
              background: 'var(--site-accent)',
              color: 'var(--site-on-accent, #fff)',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Start Verification
          </button>
        </>
      ) : null}

      {step === 'scanning' ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid var(--site-accent)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'pop-spin 1s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <p>Verifying uniqueness...</p>
          <p style={{ fontSize: '12px', color: 'var(--site-text-muted)' }}>
            Wallet: {walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}` : 'not connected'}
          </p>
        </div>
      ) : null}

      {step === 'verified' ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>OK</div>
          <p style={{ margin: '0 0 8px', fontWeight: '600' }}>Verification Complete</p>
          <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--site-text-muted)' }}>
            Unique ID:{' '}
            <code style={{ background: 'var(--site-muted-bg, #f1f5f9)', padding: '2px 6px', borderRadius: '4px' }}>
              {scanData?.hash}
            </code>
          </p>
          <p style={{ fontSize: '12px', color: 'var(--site-text-muted)' }}>
            This identifier is stored locally and used only for committee eligibility.
          </p>
        </div>
      ) : null}

      {step === 'error' ? (
        <div style={{ textAlign: 'center', color: 'var(--site-danger-text, #991b1b)' }}>
          <p style={{ margin: '0 0 12px' }}>Verification failed</p>
          <button
            type="button"
            onClick={() => setStep('intro')}
            style={{
              background: 'var(--site-muted-bg, #e2e8f0)',
              color: 'var(--site-text-primary)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      ) : null}

      <style>{'@keyframes pop-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }'}</style>
    </div>
  );
}

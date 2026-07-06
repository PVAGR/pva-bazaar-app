import type { Metadata } from 'next';
import RecoveryClient from './recovery-client';

export const metadata: Metadata = {
  title: 'Recovery Vault – PVA Bazaar',
  description:
    'Encrypted snapshot vault for cross-device continuity and account recovery on PVA Bazaar.',
};

export default function RecoveryPage() {
  return <RecoveryClient />;
}

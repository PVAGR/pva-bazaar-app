import { Ed25519Provider } from 'key-did-provider-ed25519';
import { DID } from 'dids';
import KeyResolver from 'key-did-resolver';

// In a real application, you would securely store and manage this seed.
// For this example, we'll use a static seed for predictability.
// IMPORTANT: This is not secure for production.
const seed = new Uint8Array(32);
seed.fill(1);

const provider = new Ed25519Provider(seed);
const did = new DID({ provider, resolver: KeyResolver.getResolver() });

export const generateDID = async () => {
  await did.authenticate();
  return did;
};

export const getAuthenticatedDID = async () => {
  if (!did.authenticated) {
    await did.authenticate();
  }
  return did;
};

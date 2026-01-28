import { NextResponse } from 'next/server';
import { verifyCredential } from 'did-jwt-vc';
import { getResolver } from 'key-did-resolver';
import { Resolver } from 'did-resolver';

const resolver = new Resolver(getResolver());

export async function POST(req: Request) {
  const { vcJwt } = await req.json();

  if (!vcJwt) {
    return NextResponse.json({ error: 'Missing vcJwt in request body' }, { status: 400 });
  }

  try {
    const verifiedVc = await verifyCredential(vcJwt, resolver);
    return NextResponse.json({ verified: true, verifiedVc });
  } catch (error: any) {
    console.error('VC Verification failed:', error.message);
    return NextResponse.json({ verified: false, error: error.message }, { status: 400 });
  }
}
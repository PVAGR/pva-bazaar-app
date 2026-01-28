// src/app/api/webhooks/twitch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { Stream } from '@/models/Stream';

// This is a simplified example. In a real app, you'd use a library
// to handle Twitch EventSub verification more robustly.
// See: https://dev.twitch.tv/docs/eventsub/handling-webhook-events

const TWITCH_WEBHOOK_SECRET = process.env.TWITCH_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  const messageId = req.headers.get('twitch-eventsub-message-id');
  const timestamp = req.headers.get('twitch-eventsub-message-timestamp');
  const signature = req.headers.get('twitch-eventsub-message-signature');
  const messageType = req.headers.get('twitch-eventsub-message-type');

  if (!messageId || !timestamp || !signature || !messageType) {
    return NextResponse.json({ error: 'Missing Twitch headers' }, { status: 400 });
  }

  const body = await req.text();
  const hmacMessage = messageId + timestamp + body;

  const hmac = 'sha256=' + crypto.createHmac('sha256', TWITCH_WEBHOOK_SECRET).update(hmacMessage).digest('hex');

  if (crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature))) {
    console.log("Signatures match!");

    const notification = JSON.parse(body);

    // Handle different message types
    if (messageType === 'webhook_callback_verification') {
      // This is for the initial webhook subscription verification
      return new NextResponse(notification.challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    } else if (messageType === 'notification') {
      const { event, subscription } = notification;
      await connectToDatabase();

      // Handle the specific event type
      if (subscription.type === 'stream.online') {
        console.log(`Stream is online for user: ${event.broadcaster_user_name}`);
        await Stream.findOneAndUpdate(
          { platform: 'twitch', platformStreamId: event.broadcaster_user_id },
          { status: 'live', startTime: new Date() }
        );
      } else if (subscription.type === 'stream.offline') {
        console.log(`Stream is offline for user: ${event.broadcaster_user_name}`);
        // In a real app, you'd trigger an upload to IPFS here and get a real hash.
        const placeholderIpfsHash = 'QmPlaceholderHash1234567890abcdefghijklmnop';
        await Stream.findOneAndUpdate(
          { platform: 'twitch', platformStreamId: event.broadcaster_user_id },
          { status: 'ended', endTime: new Date(), recordingIpfsHash: placeholderIpfsHash }
        );
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }
  } else {
    console.warn("Signature mismatch. Request might not be from Twitch.");
    return NextResponse.json({ error: 'Signature mismatch' }, { status: 403 });
  }

  return NextResponse.json({ received: false }, { status: 200 });
}
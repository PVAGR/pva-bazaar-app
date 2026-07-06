const {
  appendDealAuditEvent,
  generatePublicDealId,
  projectPublicDeal,
  projectVerificationSummary,
} = require('../utils/dealVisibility');

describe('dealVisibility utilities', () => {
  it('generates a compact public id', () => {
    const id = generatePublicDealId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThanOrEqual(8);
    expect(id.length).toBeLessThanOrEqual(12);
  });

  it('appends audit events to a deal object', () => {
    const deal = { auditEvents: [] };
    appendDealAuditEvent(deal, {
      eventType: 'deal_created',
      actorUserId: 'user-1',
      payload: { publicId: 'abc123' },
    });

    expect(deal.auditEvents).toHaveLength(1);
    expect(deal.auditEvents[0]).toMatchObject({
      eventType: 'deal_created',
      actorUserId: 'user-1',
      payload: { publicId: 'abc123' },
    });
  });

  it('projects a public deal without internal fields', () => {
    const source = {
      toObject: () => ({
        _id: 'deal-1',
        ownerId: 'owner-1',
        mediatorId: 'mediator-1',
        publicId: 'PUBLIC123',
        publicVisible: true,
        title: 'Community Seed Deal',
        description: 'A proposal for public review',
        counterparty: {
          userId: 'counterparty-1',
          name: 'Counterparty',
          country: 'KE',
          walletAddress: '0xabc',
          contact: 'private@example.com',
        },
        counterpartyAccess: { inviteJtiHash: 'secret' },
        messages: [{ text: 'private note' }],
        outboundDispatchQueue: [{ packetId: 'packet-1' }],
        pva: { notificationQueue: [{ eventType: 'secret' }] },
        verificationCount: 2,
        verifiedParticipants: [
          { userId: 'user-1', verifiedAt: '2026-04-18T00:00:00.000Z', method: 'jwt', note: 'ok' },
        ],
        auditEvents: [
          {
            eventType: 'deal_created',
            createdAt: '2026-04-18T00:00:00.000Z',
            payload: { hidden: true },
          },
        ],
      }),
    };

    const projected = projectPublicDeal(source);
    expect(projected.ownerId).toBeUndefined();
    expect(projected.mediatorId).toBeUndefined();
    expect(projected.counterpartyAccess).toBeUndefined();
    expect(projected.messages).toBeUndefined();
    expect(projected.outboundDispatchQueue).toBeUndefined();
    expect(projected.counterparty).toEqual({ name: 'Counterparty', country: 'KE' });
    expect(projected.pva.notificationQueue).toBeUndefined();
    expect(projected.verification.verificationCount).toBe(2);
    expect(projected.auditEvents[0]).toMatchObject({ eventType: 'deal_created' });
  });

  it('summarizes verification entries', () => {
    const summary = projectVerificationSummary({
      verificationCount: 1,
      verifiedParticipants: [
        { userId: 'user-1', verifiedAt: '2026-04-18T00:00:00.000Z', method: 'jwt', note: 'ok' },
      ],
    });

    expect(summary.verificationCount).toBe(1);
    expect(summary.verifiedParticipants).toHaveLength(1);
    expect(summary.lastVerifiedAt).toBe('2026-04-18T00:00:00.000Z');
  });
});

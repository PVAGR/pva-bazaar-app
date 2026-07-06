export const FEDERATION_CONFIG = {
  enabled: import.meta.env.VITE_FEDERATION_ENABLED === 'true',
  hubUrl: import.meta.env.VITE_FEDERATION_HUB_URL || 'https://federation.pvabazaar.org',
  communityId: import.meta.env.VITE_COMMUNITY_ID || 'pvabazaar-kenya-pilot',
  syncInterval: 5 * 60 * 1000,
};

export async function federateProposal(proposal) {
  if (!FEDERATION_CONFIG.enabled) {
    return { federated: false, reason: 'disabled' };
  }

  try {
    const response = await globalThis.fetch(`${FEDERATION_CONFIG.hubUrl}/api/proposals/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communityId: FEDERATION_CONFIG.communityId,
        proposal: {
          id: proposal.id,
          title: proposal.title,
          problem: proposal.problem,
          solution: proposal.solution,
          outcome: proposal.outcome,
          upvotes: proposal.upvotes,
          status: proposal.status,
          proposerWallet: proposal.proposerWallet,
          createdAt: proposal.createdAt,
          responses: Array.isArray(proposal.responses)
            ? proposal.responses.map((responseItem) => ({
                text: responseItem.text,
                timestamp: responseItem.timestamp,
              }))
            : [],
        },
      }),
    });

    const data = await response.json();
    return { federated: response.ok, federationId: data.id, url: data.url };
  } catch (error) {
    console.error('Federation sync failed', error);
    return { federated: false, error: error?.message || 'Federation sync failed' };
  }
}

export async function fetchFederatedProposals(limit = 10) {
  if (!FEDERATION_CONFIG.enabled) {
    return [];
  }

  try {
    const response = await globalThis.fetch(
      `${FEDERATION_CONFIG.hubUrl}/api/proposals/trending?limit=${limit}&exclude=${FEDERATION_CONFIG.communityId}`,
    );
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to fetch federated proposals', error);
    return [];
  }
}

export async function voteOnFederatedProposal(federationId, support, walletAddress, signature) {
  if (!FEDERATION_CONFIG.enabled) {
    return { success: false, reason: 'disabled' };
  }

  try {
    const response = await globalThis.fetch(
      `${FEDERATION_CONFIG.hubUrl}/api/proposals/${federationId}/vote`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterCommunity: FEDERATION_CONFIG.communityId,
          support,
          walletAddress,
          signature,
          timestamp: Date.now(),
        }),
      },
    );

    const data = await response.json();
    return { success: response.ok, ...data };
  } catch (error) {
    console.error('Federated vote failed', error);
    return { success: false, error: error?.message || 'Federated vote failed' };
  }
}

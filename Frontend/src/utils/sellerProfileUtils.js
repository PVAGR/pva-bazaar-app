/**
 * Seller profile completion utilities
 * Helps track what seller setup steps are complete
 */

export function calculateProfileCompletion(profile = {}) {
  const completion = {
    steps: {
      name: !!profile?.name?.trim(),
      email: !!profile?.email?.trim(),
      country: !!profile?.preferences?.defaultCountry?.trim(),
      currency: !!profile?.preferences?.defaultCurrency?.trim(),
      payoutAccount: !!profile?.preferences?.payoutAccountId?.trim() || 
                     !!profile?.preferences?.payoutInfo?.trim(),
    },
    total: 0,
    completed: 0,
  };

  completion.total = Object.keys(completion.steps).length;
  completion.completed = Object.values(completion.steps).filter(Boolean).length;
  completion.percentage = Math.round((completion.completed / completion.total) * 100);
  completion.isComplete = completion.completed === completion.total;

  return completion;
}

export function getProfileCompletionMessage(completion) {
  const { completed, total } = completion;
  if (completed === total) {
    return '✓ Profile complete!';
  }
  if (completed === 0) {
    return `Set up your profile (${completed}/${total})`;
  }
  return `${completed}/${total} complete`;
}

export function getMissingProfileSteps(profile = {}) {
  const steps = [];
  const completion = calculateProfileCompletion(profile);

  if (!completion.steps.name) {
    steps.push({
      id: 'name',
      label: 'Full name',
      field: 'Name',
      hint: 'Buyers see this on your listings',
    });
  }
  if (!completion.steps.country) {
    steps.push({
      id: 'country',
      label: 'Country/Location',
      field: 'Preferences → Default Country',
      hint: 'Required for shipping and taxes',
    });
  }
  if (!completion.steps.currency) {
    steps.push({
      id: 'currency',
      label: 'Currency preference',
      field: 'Preferences → Default Currency',
      hint: 'Used for all your listings',
    });
  }
  if (!completion.steps.payoutAccount) {
    steps.push({
      id: 'payoutAccount',
      label: 'Payout account',
      field: 'Preferences → Payout Account',
      hint: 'Set up before your first sale',
    });
  }

  return steps;
}

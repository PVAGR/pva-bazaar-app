const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { createUserEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');

const ROLE_INTENT_TO_APP_ROLE = {
  seller: 'seller',
  consumer: 'consumer',
  creator_artist: 'creator',
  collector: 'collector',
  researcher: 'researcher',
  federation_contributor: 'contributor',
  other: 'other',
};

function normalizeRoleIntent(rawRoleIntent) {
  const value = String(rawRoleIntent || '')
    .trim()
    .toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ROLE_INTENT_TO_APP_ROLE, value)) {
    return value;
  }
  return null;
}

function cleanText(value, maxLen = 200) {
  return String(value || '')
    .trim()
    .slice(0, maxLen);
}

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, preferences, onboardingProfile } = req.body;
    const update = { updatedAt: Date.now() };
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;

    // Merge top-level preference keys (dot-notation to avoid clobbering nested fields)
    if (preferences && typeof preferences === 'object') {
      const allowed = [
        'defaultCountry',
        'defaultCurrency',
        'defaultWalletAddress',
        'defaultTags',
        'defaultStreamPlatform',
        'defaultPublicVisibility',
        'onboarding',
        'drafts',
      ];
      for (const key of allowed) {
        if (key in preferences) {
          update[`preferences.${key}`] = preferences[key];
        }
      }
    }

    if (onboardingProfile && typeof onboardingProfile === 'object') {
      const roleIntent = normalizeRoleIntent(onboardingProfile.roleIntent);
      if (roleIntent) {
        update['onboardingProfile.roleIntent'] = roleIntent;
        update['onboardingProfile.appRole'] = ROLE_INTENT_TO_APP_ROLE[roleIntent];
      }

      if (onboardingProfile.roleOther !== undefined) {
        update['onboardingProfile.roleOther'] = String(onboardingProfile.roleOther || '')
          .trim()
          .slice(0, 120);
      }

      if (onboardingProfile.personalJourney !== undefined) {
        update['onboardingProfile.personalJourney'] = String(
          onboardingProfile.personalJourney || '',
        )
          .trim()
          .slice(0, 5000);
      }

      if (Array.isArray(onboardingProfile.federationPathTags)) {
        update['onboardingProfile.federationPathTags'] = onboardingProfile.federationPathTags
          .map((item) => String(item || '').trim())
          .filter(Boolean)
          .slice(0, 20);
      }

      if (
        onboardingProfile.emailPreferences &&
        typeof onboardingProfile.emailPreferences === 'object'
      ) {
        if (onboardingProfile.emailPreferences.digestOptIn !== undefined) {
          update['onboardingProfile.emailPreferences.digestOptIn'] = Boolean(
            onboardingProfile.emailPreferences.digestOptIn,
          );
        }
        if (onboardingProfile.emailPreferences.roleTrackUpdates !== undefined) {
          update['onboardingProfile.emailPreferences.roleTrackUpdates'] = Boolean(
            onboardingProfile.emailPreferences.roleTrackUpdates,
          );
        }
      }

      if (onboardingProfile.identity && typeof onboardingProfile.identity === 'object') {
        const identity = onboardingProfile.identity;
        if (identity.walletMode !== undefined) {
          const walletMode = String(identity.walletMode || '')
            .trim()
            .toLowerCase();
          if (['none', 'connected', 'generated'].includes(walletMode)) {
            update['onboardingProfile.identity.walletMode'] = walletMode;
          }
        }
        if (identity.generatedWalletAddress !== undefined) {
          update['onboardingProfile.identity.generatedWalletAddress'] = cleanText(
            identity.generatedWalletAddress,
            120,
          );
        }
        if (identity.generatedWalletAt !== undefined) {
          const generatedAt = new Date(identity.generatedWalletAt);
          if (!Number.isNaN(generatedAt.getTime())) {
            update['onboardingProfile.identity.generatedWalletAt'] = generatedAt;
          }
        }
        if (identity.didEnabled !== undefined) {
          update['onboardingProfile.identity.didEnabled'] = Boolean(identity.didEnabled);
        }
        if (identity.didMethod !== undefined) {
          update['onboardingProfile.identity.didMethod'] = cleanText(identity.didMethod, 80);
        }
        if (identity.ipfsEnabled !== undefined) {
          update['onboardingProfile.identity.ipfsEnabled'] = Boolean(identity.ipfsEnabled);
        }
        if (identity.ipfsCid !== undefined) {
          update['onboardingProfile.identity.ipfsCid'] = cleanText(identity.ipfsCid, 180);
        }
      }

      if (onboardingProfile.contactLinks && typeof onboardingProfile.contactLinks === 'object') {
        if (onboardingProfile.contactLinks.instagram !== undefined) {
          update['onboardingProfile.contactLinks.instagram'] = cleanText(
            onboardingProfile.contactLinks.instagram,
            120,
          );
        }
        if (onboardingProfile.contactLinks.telegram !== undefined) {
          update['onboardingProfile.contactLinks.telegram'] = cleanText(
            onboardingProfile.contactLinks.telegram,
            120,
          );
        }
        if (onboardingProfile.contactLinks.website !== undefined) {
          update['onboardingProfile.contactLinks.website'] = cleanText(
            onboardingProfile.contactLinks.website,
            300,
          );
        }
        if (onboardingProfile.contactLinks.other !== undefined) {
          update['onboardingProfile.contactLinks.other'] = cleanText(
            onboardingProfile.contactLinks.other,
            300,
          );
        }
      }

      if (onboardingProfile.compliance && typeof onboardingProfile.compliance === 'object') {
        const compliance = onboardingProfile.compliance;
        if (compliance.legalFullName !== undefined)
          update['onboardingProfile.compliance.legalFullName'] = cleanText(
            compliance.legalFullName,
            150,
          );
        if (compliance.legalIdType !== undefined)
          update['onboardingProfile.compliance.legalIdType'] = cleanText(
            compliance.legalIdType,
            80,
          );
        if (compliance.legalIdNumber !== undefined)
          update['onboardingProfile.compliance.legalIdNumber'] = cleanText(
            compliance.legalIdNumber,
            120,
          );
        if (compliance.addressLine1 !== undefined)
          update['onboardingProfile.compliance.addressLine1'] = cleanText(
            compliance.addressLine1,
            180,
          );
        if (compliance.addressLine2 !== undefined)
          update['onboardingProfile.compliance.addressLine2'] = cleanText(
            compliance.addressLine2,
            180,
          );
        if (compliance.city !== undefined)
          update['onboardingProfile.compliance.city'] = cleanText(compliance.city, 120);
        if (compliance.stateProvince !== undefined)
          update['onboardingProfile.compliance.stateProvince'] = cleanText(
            compliance.stateProvince,
            120,
          );
        if (compliance.postalCode !== undefined)
          update['onboardingProfile.compliance.postalCode'] = cleanText(compliance.postalCode, 40);
        if (compliance.country !== undefined)
          update['onboardingProfile.compliance.country'] = cleanText(compliance.country, 120);
        if (compliance.phone !== undefined)
          update['onboardingProfile.compliance.phone'] = cleanText(compliance.phone, 40);

        if (compliance.identityAttested !== undefined) {
          const attested = Boolean(compliance.identityAttested);
          update['onboardingProfile.compliance.identityAttested'] = attested;
          update['onboardingProfile.compliance.identityAttestedAt'] = attested ? new Date() : null;
          if (attested) {
            update['onboardingProfile.compliance.submittedAt'] = new Date();
          }
        }
      }
    }

    const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true }).select(
      '-password',
    );

    if (user) {
      const updatedFields = Object.keys(update).filter((k) => k !== 'updatedAt');
      dispatchToOpenClaw(createUserEvent('updated', user, { updatedFields }));

      const communityFieldsTouched = updatedFields.some(
        (field) =>
          field === 'onboardingProfile.personalJourney' ||
          field === 'onboardingProfile.federationPathTags',
      );

      if (communityFieldsTouched) {
        dispatchToOpenClaw(
          createUserEvent('community_profile_saved', user, {
            updatedFields: updatedFields.filter(
              (field) =>
                field === 'onboardingProfile.personalJourney' ||
                field === 'onboardingProfile.federationPathTags',
            ),
            pathTagsCount: Array.isArray(user?.onboardingProfile?.federationPathTags)
              ? user.onboardingProfile.federationPathTags.length
              : 0,
          }),
        );
      }
    }

    res.json({ ok: true, user });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

module.exports = router;

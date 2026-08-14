const mongoose = require('mongoose');

/**
 * PartnerProfile
 * Public "MySpace-style" page for an approved partner business.
 * Editing is capability-based: the partner receives an `editToken` by email
 * when they are approved, and uses it (and only it) to edit their own page.
 */
const partnerProfileSchema = new mongoose.Schema(
  {
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerSubmission', default: null },
    businessName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    ownerName: { type: String, trim: true, default: '' },
    contactEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    businessType: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    headline: { type: String, trim: true, default: '' },
    summary: { type: String, trim: true, default: '' },
    story: { type: String, trim: true, default: '' },
    commodities: { type: [String], default: [] },
    services: { type: [String], default: [] },
    images: {
      logoUrl: { type: String, default: '' },
      bannerUrl: { type: String, default: '' },
    },
    socialLinks: {
      instagram: { type: String, default: '' },
      tiktok: { type: String, default: '' },
      facebook: { type: String, default: '' },
      youtube: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      other: { type: String, default: '' },
    },
    contact: {
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      location: { type: String, default: '' },
      customMessage: { type: String, default: '' },
    },
    faq: [
      {
        q: { type: String, default: '' },
        a: { type: String, default: '' },
      },
    ],
    accentColor: { type: String, default: '#d4af37' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'suspended'],
      default: 'pending',
    },
    editToken: { type: String, select: false, index: true },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

partnerProfileSchema.index({ status: 1, updatedAt: -1 });
partnerProfileSchema.index({ contactEmail: 1, status: 1 });

partnerProfileSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    businessName: this.businessName,
    slug: this.slug,
    headline: this.headline,
    summary: this.summary,
    story: this.story,
    businessType: this.businessType,
    website: this.website,
    commodities: this.commodities,
    services: this.services,
    images: this.images,
    socialLinks: this.socialLinks,
    contact: this.contact,
    faq: this.faq,
    accentColor: this.accentColor,
    ownerName: this.ownerName,
    status: this.status,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('PartnerProfile', partnerProfileSchema);
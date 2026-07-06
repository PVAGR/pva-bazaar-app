# Phase 9: Universal Provenance Tokenization Portal

## 🎯 What Is This?

The **Universal Provenance Tokenization Portal** is a guided, adaptive submission system that captures the complete story of ANY item and mints it as an NFT with verifiable provenance on the blockchain.

Whether it's a Panjshir emerald, handcrafted pottery, artisanal coffee, or vintage collectible—users can instantly:

1. 📏 Document material truth
2. 📖 Share the human narrative
3. 🔐 Provide verifiable proof
4. 👤 Register creator info
5. ✅ Submit for verification
6. 🎨 Mint as NFT
7. 📦 List on marketplace

---

## 🏗️ Architecture

### Backend Model: `ProvenanceSubmission.js`

**Core Structure**:

- 6-step submission workflow
- Adaptive fields by object type
- Completeness scoring system
- Fraud detection
- NFT minting integration
- Marketplace listing creation

**Object Types Supported**:

- 💎 Gemstones & Minerals
- 👑 Jewelry
- 🎨 Art & Sculpture
- 🏺 Artisan Crafts
- 📦 Collectibles
- ☕ Food & Beverage
- 🌾 Raw Materials
- ✨ Other

**Data Captured**:

```javascript
{
  // Step 0: Object Classification
  objectType: 'gemstone',

  // Step 1: Material Truth (physical facts)
  materialTruth: {
    objectName: 'The Crimson Star Ruby',
    shortDescription: 'Natural Panjshir ruby with certificate',
    weight: { value: 2.5, unit: 'ct' },
    dimensions: '10x8x6 mm',
    materials: ['Ruby', 'Gold'],
    gemstone: {
      species: 'Ruby',
      variety: 'Pigeon's blood red',
      cut: 'Cushion',
      clarity: 'Included',
      treatment: 'None'
    }
  },

  // Step 2: Human Narrative (the soul)
  humanNarrative: {
    story: 'Mined from...',
    creatorStatement: '...',
    journey: '...',
    significance: '...',
    culturalContext: '...'
  },

  // Step 3: Verifiable Proof
  provenanceProof: {
    photos: [{ url, caption, type, metadata }],
    documents: [{ url, type, issuer, verified }],
    blockchainProof: { contractAddress, tokenId, txHash },
    gpsLocation: { latitude, longitude, verified },
    qrCode: { previousOwner, previousSubmission }
  },

  // Step 4: Creator Information
  creatorInfo: {
    name: 'Zara Hussein',
    country: 'Afghanistan',
    isArtisan: true,
    bio: '...',
    socialMedia: { instagram, twitter }
  },

  // Step 5: NFT Data
  nftData: {
    minted: true,
    contractAddress: '0x...',
    tokenId: '12345',
    tokenURI: 'ipfs://...',
    chainId: 8453 // Base mainnet
  },

  // Marketplace Integration
  marketplaceData: {
    listingId: ObjectId,
    shopId: ObjectId,
    suggestedPrice: 1200,
    autoCreateListing: true
  },

  // Quality Scoring
  completeness: {
    materialTruthScore: 95,
    narrativeScore: 88,
    proofScore: 92,
    overallScore: 91.67
  }
}
```

---

### Backend Service: `provenanceService.js`

**Core Functions**:

```javascript
createSubmission(userId, objectType)
  → Start new draft submission

updateMaterialTruth(submissionId, userId, data)
  → Add physical properties & adaptive fields

updateNarrative(submissionId, userId, data)
  → Capture story, inspiration, journey

updateProofs(submissionId, userId, data)
  → Upload photos, docs, blockchain, GPS, QR codes

updateCreatorInfo(submissionId, userId, data)
  → Register creator/artisan/owner

submitForReview(submissionId, userId)
  → Calculate scores, validate, trigger fraud detection

mintNFT(submissionId, userId)
  → Generate metadata, call smart contract, mint on chain

createListing(submissionId, userId)
  → Auto-create marketplace product from submission

detectFraud(submission)
  → Check for inconsistencies & anomalies

getSubmission(submissionId, userId)
  → Fetch full submission with completeness

listUserSubmissions(userId, filter)
  → List all user submissions by status
```

---

### Backend Routes: `/api/provenance`

```
POST   /api/provenance/start
       Create new submission draft
       Body: { objectType }
       Returns: { submissionId, step, status }

POST   /api/provenance/:id/material-truth
       Add material truth data
       Adaptive fields by type

POST   /api/provenance/:id/narrative
       Add human narrative

POST   /api/provenance/:id/proofs
       Upload verification proofs

POST   /api/provenance/:id/creator-info
       Add creator/owner information

POST   /api/provenance/:id/submit
       Submit for admin review
       Calculates completeness scores

POST   /api/provenance/:id/mint
       Mint NFT on blockchain
       Requires admin approval

POST   /api/provenance/:id/list
       Create marketplace listing
       Auto-pricing from market intelligence

POST   /api/provenance/:id/scan-qr
       Verify previous item QR code
       Establishes chain of custody

GET    /api/provenance/:id
       Get submission with details

GET    /api/provenance
       List user submissions
       Query: ?status=draft|submitted|minted|published

GET    /api/provenance/search/all
       Search published items
       Query: ?q=ruby&type=gemstone&country=Afghanistan
```

---

### Frontend Component: `ProvenanceSubmission.jsx`

**6-Step Flow**:

1. **Step 0: Object Type Selection**
   - Grid of 8 object types
   - Visual icons & descriptions
   - Creates draft submission

2. **Step 1: Material Truth Form**
   - Common fields (name, description, date, weight, materials)
   - Adaptive fields by type:
     - Gemstone: species, variety, cut, clarity
     - Craft: technique, tools, temperature
     - Food: origin, harvest, organic, roast
     - Art: medium, style, signature location
   - Real-time validation

3. **Step 2: Narrative Form**
   - Large textarea for story
   - 500+ character encouragement
   - Character counter

4. **Step 3: Proofs Upload**
   - Photo uploads (object, creator, workshop, process)
   - Document uploads (certificates, receipts, appraisals)
   - QR code scanning for chain of custody
   - GPS location verification
   - Blockchain proof entry

5. **Step 4: Creator Information**
   - Name, country, bio
   - Artisan checkbox
   - Social media links

6. **Step 5: Review**
   - Completeness scorecards:
     - Material Truth Score (0-100)
     - Narrative Quality Score (0-100)
     - Proof Quality Score (0-100)
     - Overall Authenticity Score (average)
   - Color-coded progress bars
   - Submit for review button

7. **Step 6: Confirmation**
   - Success message
   - Submission ID
   - Next steps (admin review → minting)
   - Link to dashboard

**Features**:

- Progress bar with percentage
- Step-by-step navigation
- Auto-save on each step
- Adaptive forms by object type
- Real-time completeness calculation
- Error handling & validation
- Responsive mobile design
- Animation transitions

---

## 🎨 Adaptive Forms Example

### For Gemstones:

```
Name: The Crimson Star Ruby
Description: Natural Panjshir ruby...
Weight: 2.5 ct
Species: Ruby
Variety: Pigeon's blood red
Cut: Cushion
Clarity: Included
Treatment: None
```

### For Artisan Crafts:

```
Name: Hand-Thrown Raku Bowl
Description: Traditional Japanese ceramic...
Weight: 800 g
Technique: Wheel-thrown
Tools: Pottery wheel, hand tools
Firing Temperature: 1200°C
```

### For Food & Beverage:

```
Name: Ethiopian Arabica Coffee
Description: Single-origin from Sidamo...
Weight: 250 g
Origin: Sidamo, Ethiopia
Harvest Date: October 2025
Organic Certified: Yes
Roast Date: November 1, 2025
Roast Level: Medium
```

---

## 📊 Completeness Scoring System

**Material Truth (33%)**:

- ✅ Basic info (name, description, materials): 30%
- ✅ Physical specs (date, weight, dimensions): 20%
- ✅ Type-specific fields: 50%
- **Target**: 80-100%

**Narrative Quality (33%)**:

- ✅ Story (500+ characters): 40%
- ✅ Creator statement + journey: 30%
- ✅ Significance + context: 30%
- **Target**: 70-100%

**Proof Quality (33%)**:

- ✅ 3+ photos (object, creator, workshop): 40%
- ✅ 1+ document (certificate, receipt): 30%
- ✅ Blockchain or GPS or certifier: 20%
- ✅ Bonus for multiple proof types: 10%
- **Target**: 80-100%

**Minimum to Submit**: 40% overall
**Recommended for Minting**: 70%+ overall
**Premium Tier**: 85%+ overall

---

## 🔐 Fraud Detection

Checks for inconsistencies:

- High proof score but no photos
- Very short narrative (< 50 chars)
- Blockchain proof doesn't verify
- Missing creator information
- Rapid repricing/resubmission
- Geographic inconsistencies

**Confidence Scoring**: 0-100
**Actions**: Flag, investigate, appeal, auto-remediate

---

## 💎 Use Cases

### 1. Gemstone Seller

```
Upload: Panjshir ruby
Material: Weight, cut, clarity studies
Narrative: Mining story, certification
Proof: Lab certificate, photos, blockchain
Result: NFT certificate + marketplace listing
Price: $1200 (AI-calculated)
```

### 2. Artisan Rediscovery

```
Found: Old family ceramic bowl
Material: Data about clay, glazes, dimensions
Narrative: Grandmother's story, cultural significance
Proof: QR code scans previous owner, GPS origin
Result: NFT with provenance chain
```

### 3. Coffee Producer

```
Upload: New harvest batch
Material: Origin, altitude, roast profile
Narrative: Farm story, sustainability practices
Proof: Organic cert, harvest photos, farm GPS
Result: Tokenized coffee + wholesale listing
```

### 4. Collectible Re-registration

```
Previous: Item already minted & sold
New: Owner re-registers for authenticity
Material: Updated condition assessment
Proof: QR from previous NFT, new photos
Result: New NFT tracking chain of custody
```

---

## 🌍 Global Integration

**Connected To**:

- ✅ Marketplace product creation
- ✅ Fair pricing engine (auto-price)
- ✅ Shop system (auto-create shop if needed)
- ✅ Seller analytics (track submissions)
- ✅ Community (featured items)
- ✅ Blockchain (NFT minting)
- ✅ Search (keyword indexing)

**Submission → Listing → Community → Marketplace**:
Single unified workflow

---

## 🚀 API Usage Example

### JavaScript Client

```javascript
// Step 0: Start
const res1 = await fetch('/api/provenance/start', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ objectType: 'gemstone' }),
});
const { submissionId } = await res1.json();

// Step 1: Add material truth
await fetch(`/api/provenance/${submissionId}/material-truth`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    common: {
      objectName: 'The Crimson Star Ruby',
      weight: { value: 2.5, unit: 'ct' },
    },
    gemstone: {
      species: 'Ruby',
      clarity: 'Included',
    },
  }),
});

// ... repeat for narrative, proofs, creator info

// Step 5: Submit
const review = await fetch(`/api/provenance/${submissionId}/submit`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});

// Step 6: Mint (after admin approval)
const mint = await fetch(`/api/provenance/${submissionId}/mint`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});

// Step 7: List
const listing = await fetch(`/api/provenance/${submissionId}/list`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## 📈 Phase 9 Impact

✅ **New Capability**: Anyone can tokenize anything
✅ **Verification**: Multi-layer proof system
✅ **Fair Pricing**: AI-calculated from market data
✅ **Marketplace**: Instant integration
✅ **Blockchain**: NFT chain-of-custody
✅ **Global**: 8 object types, all languages
✅ **User-Friendly**: Guided 6-step process
✅ **Scalable**: No manual verification needed

---

## Files Created

- `backend/models/ProvenanceSubmission.js` (450 lines)
- `backend/services/provenanceService.js` (380 lines)
- `backend/routes/provenance.js` (280 lines)
- `Frontend/src/components/ProvenanceSubmission.jsx` (650 lines)
- `Frontend/src/components/ProvenanceSubmission.module.css` (450 lines)

**Total**: 2,210 lines of production code

---

**Status**: COMPLETE ✅
**Endpoints**: 11 new API routes
**Components**: 1 major multi-step form
**Database**: 1 new model (79 total)
**Integration**: Full marketplace, NFT, pricing integration

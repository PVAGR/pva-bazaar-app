#!/usr/bin/env node
/**
 * Seed broker templates (vetting prompts, intro emails, pitches).
 * Run: node scripts/seed-templates.js
 * Requires: MongoDB connection, admin user (admin@pvabazaar.org)
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../backend/models/User');
const Template = require('../backend/models/Template');

const TEMPLATES = [
  {
    name: 'Universal Coffee Supplier Vetting',
    type: 'vetting',
    body: `Subject: Serious buyer — need full specs before sample/order

Hello,

I represent US buyers and need complete details before proceeding. Please answer **all** questions below:

**1. PRICING (FOB Ho Chi Minh City)**
- Price per kg for 500 kg trial order?
- Price per kg for 12,000 kg (full 20ft container)?
- Are prices firm through March 2026?

**2. SUPPLIER VERIFICATION**
- Are you the direct farm owner or a trading company?
- If farm: Please provide registered farm name + Vietnam business license number.
- If trader: Who is the actual producer? Provide their farm registration code with provincial agriculture department.

**3. QUALITY PROOF**
- What is the exact SCA Q Grader score for this lot? (If not certified, what's the cup score?)
- Variety clarification: Did you mean **Catimor**? (Your message said "Catimo")
- Altitude verification: Is this truly 1,400m? Buon Ma Thuot is mostly Robusta zone — please confirm exact farm coordinates.

**4. SAMPLE POLICY**
- Will you send a free 500g sample?
- If not free: What is the MAX cost including DHL/FedEx shipping to ZIP 95670 (USA)?
- What is the harvest date printed on the sample bag?

**5. EXPORT CAPABILITY (Critical for US buyers)**
- Can you provide these documents with every shipment?
☐ Phytosanitary Certificate (Vietnam government issued)
☐ Certificate of Origin
☐ Commercial Invoice
☐ Bill of Lading naming **US buyer** as consignee (not me)
- How many metric tons of green Arabica have you exported to the USA in the last 12 months? Please share a redacted bill of lading or export declaration.

**6. PAYMENT & LOGISTICS**
- Payment terms for first order? (e.g., 30% deposit / 70% against B/L copy)
- Do you accept LC at sight?
- Estimated lead time from order confirmation to FOB shipment?

**7. CERTIFICATIONS**
- Do you have USDA Organic certification? (NOP)
- Do you have Fair Trade or Rainforest Alliance?
- What ISO certification? (ISO 22000/HACCP or ISO 9001?)

I need this information to secure buyer commitment. Suppliers who cannot provide clear answers will not be considered.

Thank you,
[Your Name]
Broker — USA`,
  },
  {
    name: 'Short Coffee Vetting (under $500 sample)',
    type: 'vetting',
    body: `Hello,

I'm a US broker looking to order samples first, then containers. Please answer quickly:

1. **Sample cost**: 500g sample shipped to ZIP 95670 (USA) — total price including shipping?
2. **FOB price**: Price per kg FOB Ho Chi Minh City for:
   - 500 kg
   - 12,000 kg (full container)
3. **Who are you**: Direct farm or trading company? If farm, what's your registered name?
4. **Export docs**: Can you provide phytosanitary certificate and certificate of origin for US customs?
5. **Payment**: What are your terms for first order? (e.g., 30% deposit / 70% before shipment)

I only work with suppliers who give clear answers. Looking forward to your reply.`,
  },
  {
    name: 'General Intro (US Buyer Representation)',
    type: 'intro',
    body: `Hi [Contact Name/Team],

My name is Richard, and I'm a direct supply chain sourcer based in Rancho Cordova, California, USA. I specialize in connecting global suppliers with US markets, handling products like premium Kenyan coffee beans, Congolese malachite, Kenyan soapstone carvings, and colored gemstones from regions like Pakistan and Afghanistan. With my network of direct sources worldwide, I ensure efficient, ethical sourcing and distribution without needing to travel—I'm set up as a fully remote digital nomad.

I'm reaching out because [specific reason, e.g., 'I'm interested in partnering with Kenyan exporters for coffee beans']. I can offer US market insights, streamlined logistics, and potential buyers in California and beyond. Would you be open to a quick virtual call or chat to discuss opportunities?

Reach me at pvaglobalreach@gmail.com or pvabazaar.com. Looking forward to connecting!

Best,
Richard
Supply Chain Direct Sourcer
Rancho Cordova, CA, USA
pvaglobalreach@gmail.com | pvabazaar.com`,
  },
  {
    name: 'Wrestling Soapstone Figurine Pitch',
    type: 'pitch',
    body: `The next generation model of wrestling = you!

Hello, my name is Richard Torres. I'm 28 from Sacramento California and I grew up with late WWE and the internet—it was amazing. I definitely think you're one of the next generation best pro wrestlers right now!

The reason why I wanted to reach out was for a business proposal: I work with a guy in Kenya who lives near Tabaka Valley, near a very popular soapstone quarry. He's an artisan who works with a group of guys who cut and polish this soapstone for a living. We recently started working with each other in late 2025! We are currently working on our first collaboration together.

I noticed a lot of people not being big fans of the new figurines coming out for WWE wrestlers. I was thinking of a new way for figurines—maybe something like 100 or more statues of you holding up your favorite championship belt, in your wrestling attire. Instead of being made by a company, they'll be made by these Kenyan artisans I can introduce you to over Zoom or anything else!

What's different: 100% handmade, carved from soapstone in Kenya. Each one will have a unique variation. We can figure out 2–3 unique variations of soapstone figurines you'd like to see. We can make a sample on the house and ship it to wherever you'd like!

@pvaglobal on Instagram | pvabazaar.com is my work.

Thanks for your time,
Richard`,
  },
];

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pvabazaar';
  await mongoose.connect(uri, { dbName: 'pvabazaar', autoIndex: true });

  const admin = await User.findOne({ email: 'admin@pvabazaar.org' });
  if (!admin) {
    console.error('❌ No admin user found. Run seed.js first to create admin@pvabazaar.org');
    process.exit(1);
  }

  let inserted = 0;
  for (const t of TEMPLATES) {
    const exists = await Template.findOne({ ownerId: admin._id, name: t.name });
    if (!exists) {
      await Template.create({
        ownerId: admin._id,
        name: t.name,
        type: t.type,
        body: t.body,
      });
      inserted++;
      console.log(`✅ Created: ${t.name}`);
    } else {
      console.log(`ℹ️  Exists: ${t.name}`);
    }
  }

  console.log(`\n✅ Seeded ${inserted} template(s). Total: ${TEMPLATES.length}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('❌ Error:', e?.message || e);
  process.exitCode = 1;
});

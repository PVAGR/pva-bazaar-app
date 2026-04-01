export const FEATURED_INVENTORY = [
  {
    id: "000000000000000000000001",
    _id: "000000000000000000000001",
    slug: "maradjet-emerald-pendant",
    name: "Maradjet Emerald Pendant",
    title: "Handcrafted Emerald Pendant",
    description:
      "A stunning emerald pendant featuring natural Panjshir emerald set in 18k gold.",
    category: "Jewelry",
    media: [
      "https://i2.seadn.io/base/0x3b3af296e521a0932041cc5599ea47ec2d4ef8a5/ab0864492d648de4434dd73c10970a/04ab0864492d648de4434dd73c10970a.jpeg?w=1000",
    ],
    tags: ["Panjshir Emerald", "18k Gold"],
    catalog: {
      sku: "PVA-0001",
      isUnique: true,
      bulkQuantity: 0,
      availabilityStatus: "available",
      origin: {
        country: "Afghanistan",
        region: "Panjshir",
      },
      dimensions: {
        length: 22,
        width: 14,
        height: 7,
        unit: "mm",
      },
      weight: {
        value: 4.8,
        unit: "ct",
      },
      gemProperties: {
        hardnessMohs: 7.5,
        color: "Emerald Green",
        clarity: "VS",
        cutShape: "Pear",
        treatmentStatus: "Natural",
      },
      mediaAssets: {
        videoUrl: "",
      },
    },
  },
  {
    id: "000000000000000000000002",
    _id: "000000000000000000000002",
    slug: "traditional-afghan-carpet",
    name: "Traditional Afghan Carpet",
    title: "Hand-woven Afghan Carpet",
    description:
      "Traditional Afghan carpet with intricate geometric patterns, hand-woven by master craftsmen.",
    category: "Textiles",
    media: [
      "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80",
    ],
    tags: ["Wool", "Natural Dyes"],
    catalog: {
      sku: "PVA-0002",
      isUnique: false,
      bulkQuantity: 12,
      availabilityStatus: "available",
      origin: {
        country: "Afghanistan",
        region: "Herat",
      },
      dimensions: {
        length: 2100,
        width: 1500,
        height: 8,
        unit: "mm",
      },
      weight: {
        value: 10.5,
        unit: "kg",
      },
      gemProperties: {
        hardnessMohs: 0,
        color: "Red / Indigo",
        clarity: "N/A",
        cutShape: "Rectangular",
        treatmentStatus: "Hand-dyed",
      },
      mediaAssets: {
        videoUrl: "",
      },
    },
  },
];

export function findFeaturedItem(slugOrId) {
  const target = String(slugOrId || "").trim().toLowerCase();
  return (
    FEATURED_INVENTORY.find((item) => {
      return (
        String(item.id || "").toLowerCase() === target ||
        String(item._id || "").toLowerCase() === target ||
        String(item.slug || "").toLowerCase() === target
      );
    }) || null
  );
}

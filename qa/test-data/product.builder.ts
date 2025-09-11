import { faker } from '@faker-js/faker';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  tags: string[];
  imageUrl: string;
  imageAlt: string;
  artistId: string;
  artistName: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'published' | 'sold' | 'archived';
  dimensions?: {
    width: number;
    height: number;
    depth?: number;
    unit: 'cm' | 'in' | 'mm';
  };
  materials?: string[];
  techniques?: string[];
  isLimitedEdition: boolean;
  editionSize?: number;
  editionNumber?: number;
  provenance: ProvenanceRecord[];
  blockchain?: {
    contractAddress: string;
    tokenId: string;
    network: 'ethereum' | 'polygon' | 'binance';
  };
}

export interface Artist {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio: string;
  profileImageUrl: string;
  coverImageUrl: string;
  location: {
    city: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  socialMedia: {
    website?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
    linkedin?: string;
  };
  verificationStatus: 'unverified' | 'pending' | 'verified';
  specialties: string[];
  yearsExperience: number;
  education?: string[];
  exhibitions?: Exhibition[];
  awards?: Award[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  role: 'buyer' | 'artist' | 'admin';
  preferences: {
    currency: string;
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    privacy: {
      showEmail: boolean;
      showLocation: boolean;
      showPurchases: boolean;
    };
  };
  address?: Address;
  paymentMethods: PaymentMethod[];
  wishlist: string[]; // Product IDs
  collections: Collection[];
  createdAt: Date;
  lastActiveAt: Date;
  isActive: boolean;
}

export interface ProvenanceRecord {
  id: string;
  timestamp: Date;
  event: 'created' | 'transferred' | 'exhibited' | 'authenticated' | 'restored';
  description: string;
  location?: string;
  documentUrl?: string;
  verifiedBy?: string;
  hash?: string;
}

export interface Exhibition {
  name: string;
  venue: string;
  city: string;
  year: number;
  type: 'solo' | 'group';
  url?: string;
}

export interface Award {
  name: string;
  organization: string;
  year: number;
  category?: string;
  description?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'paypal' | 'crypto' | 'bank_transfer';
  isDefault: boolean;
  lastFour?: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  holderName?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  productIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  productId: string;
  artistId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  shippingAddress: Address;
  billingAddress: Address;
  trackingNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
}

class ProductBuilder {
  private product: Partial<Product> = {};

  static create(): ProductBuilder {
    return new ProductBuilder();
  }

  withDefaults(): ProductBuilder {
    this.product = {
      id: faker.string.uuid(),
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price()),
      currency: 'USD',
      category: faker.helpers.arrayElement(['painting', 'sculpture', 'photography', 'digital', 'mixed_media']),
      tags: faker.helpers.arrayElements(['abstract', 'modern', 'contemporary', 'figurative', 'landscape'], { min: 1, max: 3 }),
      imageUrl: faker.image.url(),
      imageAlt: faker.lorem.sentence(),
      artistId: faker.string.uuid(),
      artistName: faker.person.fullName(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      status: 'published',
      isLimitedEdition: faker.datatype.boolean(),
      provenance: [],
    };
    return this;
  }

  withName(name: string): ProductBuilder {
    this.product.name = name;
    return this;
  }

  withPrice(price: number): ProductBuilder {
    this.product.price = price;
    return this;
  }

  withCategory(category: string): ProductBuilder {
    this.product.category = category;
    return this;
  }

  withStatus(status: Product['status']): ProductBuilder {
    this.product.status = status;
    return this;
  }

  withArtist(artistId: string, artistName: string): ProductBuilder {
    this.product.artistId = artistId;
    this.product.artistName = artistName;
    return this;
  }

  withDimensions(width: number, height: number, depth?: number, unit: 'cm' | 'in' | 'mm' = 'cm'): ProductBuilder {
    this.product.dimensions = { width, height, depth, unit };
    return this;
  }

  withMaterials(materials: string[]): ProductBuilder {
    this.product.materials = materials;
    return this;
  }

  withLimitedEdition(editionSize: number, editionNumber: number): ProductBuilder {
    this.product.isLimitedEdition = true;
    this.product.editionSize = editionSize;
    this.product.editionNumber = editionNumber;
    return this;
  }

  withBlockchain(contractAddress: string, tokenId: string, network: 'ethereum' | 'polygon' | 'binance'): ProductBuilder {
    this.product.blockchain = { contractAddress, tokenId, network };
    return this;
  }

  withProvenance(records: ProvenanceRecord[]): ProductBuilder {
    this.product.provenance = records;
    return this;
  }

  build(): Product {
    if (!this.product.id) {
      this.withDefaults();
    }
    return this.product as Product;
  }

  buildMany(count: number): Product[] {
    return Array.from({ length: count }, () => {
      return ProductBuilder.create().withDefaults().build();
    });
  }
}

class ArtistBuilder {
  private artist: Partial<Artist> = {};

  static create(): ArtistBuilder {
    return new ArtistBuilder();
  }

  withDefaults(): ArtistBuilder {
    this.artist = {
      id: faker.string.uuid(),
      username: faker.internet.userName(),
      displayName: faker.person.fullName(),
      email: faker.internet.email(),
      bio: faker.lorem.paragraphs(2),
      profileImageUrl: faker.image.avatar(),
      coverImageUrl: faker.image.url(),
      location: {
        city: faker.location.city(),
        country: faker.location.country(),
      },
      socialMedia: {
        website: faker.internet.url(),
        instagram: faker.internet.userName(),
      },
      verificationStatus: 'unverified',
      specialties: faker.helpers.arrayElements(['painting', 'sculpture', 'photography', 'digital art'], { min: 1, max: 2 }),
      yearsExperience: faker.number.int({ min: 1, max: 30 }),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      isActive: true,
    };
    return this;
  }

  withUsername(username: string): ArtistBuilder {
    this.artist.username = username;
    return this;
  }

  withDisplayName(displayName: string): ArtistBuilder {
    this.artist.displayName = displayName;
    return this;
  }

  withEmail(email: string): ArtistBuilder {
    this.artist.email = email;
    return this;
  }

  withVerificationStatus(status: Artist['verificationStatus']): ArtistBuilder {
    this.artist.verificationStatus = status;
    return this;
  }

  withLocation(city: string, country: string): ArtistBuilder {
    this.artist.location = { city, country };
    return this;
  }

  withSpecialties(specialties: string[]): ArtistBuilder {
    this.artist.specialties = specialties;
    return this;
  }

  withYearsExperience(years: number): ArtistBuilder {
    this.artist.yearsExperience = years;
    return this;
  }

  withExhibitions(exhibitions: Exhibition[]): ArtistBuilder {
    this.artist.exhibitions = exhibitions;
    return this;
  }

  withAwards(awards: Award[]): ArtistBuilder {
    this.artist.awards = awards;
    return this;
  }

  build(): Artist {
    if (!this.artist.id) {
      this.withDefaults();
    }
    return this.artist as Artist;
  }

  buildMany(count: number): Artist[] {
    return Array.from({ length: count }, () => {
      return ArtistBuilder.create().withDefaults().build();
    });
  }
}

class UserBuilder {
  private user: Partial<User> = {};

  static create(): UserBuilder {
    return new UserBuilder();
  }

  withDefaults(): UserBuilder {
    this.user = {
      id: faker.string.uuid(),
      username: faker.internet.userName(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: 'buyer',
      preferences: {
        currency: 'USD',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
        privacy: {
          showEmail: false,
          showLocation: true,
          showPurchases: false,
        },
      },
      paymentMethods: [],
      wishlist: [],
      collections: [],
      createdAt: faker.date.past(),
      lastActiveAt: faker.date.recent(),
      isActive: true,
    };
    return this;
  }

  withRole(role: User['role']): UserBuilder {
    this.user.role = role;
    return this;
  }

  withName(firstName: string, lastName: string): UserBuilder {
    this.user.firstName = firstName;
    this.user.lastName = lastName;
    return this;
  }

  withEmail(email: string): UserBuilder {
    this.user.email = email;
    return this;
  }

  withAddress(address: Address): UserBuilder {
    this.user.address = address;
    return this;
  }

  withPaymentMethods(methods: PaymentMethod[]): UserBuilder {
    this.user.paymentMethods = methods;
    return this;
  }

  withWishlist(productIds: string[]): UserBuilder {
    this.user.wishlist = productIds;
    return this;
  }

  build(): User {
    if (!this.user.id) {
      this.withDefaults();
    }
    return this.user as User;
  }

  buildMany(count: number): User[] {
    return Array.from({ length: count }, () => {
      return UserBuilder.create().withDefaults().build();
    });
  }
}

// Test data generators
export class TestDataGenerator {
  static generateProducts(count: number = 10): Product[] {
    return ProductBuilder.create().buildMany(count);
  }

  static generateArtists(count: number = 5): Artist[] {
    return ArtistBuilder.create().buildMany(count);
  }

  static generateUsers(count: number = 10): User[] {
    return UserBuilder.create().buildMany(count);
  }

  static generateEdgeCaseProducts(): Product[] {
    return [
      // Very expensive product
      ProductBuilder.create()
        .withDefaults()
        .withName('Extremely Rare Masterpiece')
        .withPrice(1000000)
        .withLimitedEdition(1, 1)
        .build(),

      // Very cheap product
      ProductBuilder.create()
        .withDefaults()
        .withName('Digital Sketch')
        .withPrice(1)
        .withCategory('digital')
        .build(),

      // Product with very long name
      ProductBuilder.create()
        .withDefaults()
        .withName('A'.repeat(255))
        .build(),

      // Product with empty description
      ProductBuilder.create()
        .withDefaults()
        .withName('Minimalist Art')
        .build(),

      // Draft product
      ProductBuilder.create()
        .withDefaults()
        .withStatus('draft')
        .build(),

      // Sold product
      ProductBuilder.create()
        .withDefaults()
        .withStatus('sold')
        .build(),
    ];
  }

  static generateProvenance(): ProvenanceRecord[] {
    return [
      {
        id: faker.string.uuid(),
        timestamp: faker.date.past(),
        event: 'created',
        description: 'Original artwork created by artist',
        location: faker.location.city(),
        verifiedBy: faker.person.fullName(),
        hash: faker.string.hexadecimal({ length: 64 }),
      },
      {
        id: faker.string.uuid(),
        timestamp: faker.date.recent(),
        event: 'authenticated',
        description: 'Artwork authenticated by expert',
        location: faker.location.city(),
        verifiedBy: faker.person.fullName(),
        documentUrl: faker.internet.url(),
        hash: faker.string.hexadecimal({ length: 64 }),
      },
    ];
  }

  static generateAddress(): Address {
    return {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      postalCode: faker.location.zipCode(),
      country: faker.location.country(),
    };
  }

  static generatePaymentMethod(): PaymentMethod {
    return {
      id: faker.string.uuid(),
      type: faker.helpers.arrayElement(['credit_card', 'debit_card', 'paypal']),
      isDefault: faker.datatype.boolean(),
      lastFour: faker.string.numeric(4),
      expiryMonth: faker.number.int({ min: 1, max: 12 }),
      expiryYear: faker.number.int({ min: 2024, max: 2030 }),
      brand: faker.helpers.arrayElement(['visa', 'mastercard', 'amex']),
      holderName: faker.person.fullName(),
    };
  }

  static generateOrder(userId: string, productId: string, artistId: string): Order {
    return {
      id: faker.string.uuid(),
      userId,
      productId,
      artistId,
      amount: parseFloat(faker.commerce.price()),
      currency: 'USD',
      status: faker.helpers.arrayElement(['pending', 'confirmed', 'shipped', 'delivered']),
      paymentMethod: 'credit_card',
      paymentStatus: faker.helpers.arrayElement(['pending', 'completed']),
      shippingAddress: this.generateAddress(),
      billingAddress: this.generateAddress(),
      trackingNumber: faker.string.alphanumeric(10),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };
  }

  static generateInvalidData(): any {
    return {
      invalidProduct: {
        name: '', // Invalid: empty name
        price: -100, // Invalid: negative price
        category: 'invalid_category', // Invalid: unknown category
        email: 'not-an-email', // Invalid: bad email format
      },
      invalidUser: {
        email: 'invalid-email',
        firstName: '', // Invalid: empty name
        lastName: null, // Invalid: null value
        role: 'invalid_role', // Invalid: unknown role
      },
      maliciousData: {
        xssAttempt: '<script>alert("XSS")</script>',
        sqlInjection: "'; DROP TABLE users; --",
        oversizedString: 'A'.repeat(100000),
        unicodeAttack: '🎨'.repeat(1000),
      },
    };
  }
}

export { ProductBuilder, ArtistBuilder, UserBuilder };
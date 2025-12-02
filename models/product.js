const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // Basic Information
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    
    // Categories
    category: {
      type: String,
      required: true,
      enum: ['men', 'women','unisex'],
    },
    subcategory: {
      type: String,
      required: true,
      enum: ['shirts', 'polos', 'hoodies', 'caps', 'tanks', 'jumpsuits'],
    },
    
    // Pricing
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      default: null,
      min: 0,
    },
    currency: {
      type: String,
      default: 'NGN',
      enum: ['NGN', 'USD', 'EUR', 'GBP'],
    },
    
    // Inventory
    inStock: {
      type: Boolean,
      default: true,
    },
    stockCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    
    // Product Details
    images: [{
      type: String,
      required: true,
    }],
    sizes: [{
      type: String,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'],
    }],
    colors: [{
      type: String,
      trim: true,
    }],
    
    // Description & Features
    description: {
      type: String,
      required: true,
    },
    features: [{
      type: String,
    }],
    
    // Product Specifications
    material: {
      type: String,
      required: true,
    },
    care: {
      type: String,
      required: true,
    },
    madeIn: {
      type: String,
      required: true,
    },
    
    // Ratings & Reviews
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Tags
    tags: [{
      type: String,
      lowercase: true,
      trim: true,
    }],
    
    // SEO & Metadata
    metaTitle: {
      type: String,
    },
    metaDescription: {
      type: String,
    },
    
    // Timestamps
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
productSchema.index({ slug: 1 });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Virtuals
productSchema.virtual('discountPercentage').get(function() {
  if (this.salePrice && this.price > this.salePrice) {
    return Math.round(((this.price - this.salePrice) / this.price) * 100);
  }
  return 0;
});

productSchema.virtual('isOnSale').get(function() {
  return this.salePrice !== null && this.salePrice < this.price;
});

// Pre-save middleware - FIXED
// Pre-save middleware - Auto-generate slug
productSchema.pre('save', function() {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});
// Static methods
productSchema.statics.getByCategory = function(categorySlug) {
  return this.find({ category: categorySlug, isActive: true });
};

productSchema.statics.getBySubcategory = function(subcategorySlug) {
  return this.find({ subcategory: subcategorySlug, isActive: true });
};

productSchema.statics.getFeatured = function(limit = 8) {
  return this.find({ tags: 'bestseller', isActive: true }).limit(limit);
};

productSchema.statics.getNewArrivals = function(limit = 8) {
  return this.find({ tags: 'new-arrival', isActive: true }).limit(limit);
};

productSchema.statics.getSaleProducts = function() {
  return this.find({ 
    salePrice: { $ne: null }, 
    isActive: true 
  });
};

productSchema.statics.searchProducts = function(query) {
  return this.find(
    { 
      $text: { $search: query },
      isActive: true 
    },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

// Instance methods
productSchema.methods.isAvailable = function() {
  return this.inStock && this.stockCount > 0;
};

// Instance method to reduce stock
productSchema.methods.reduceStock = async function(quantity) {
  if (this.stockCount >= quantity) {
    this.stockCount -= quantity;
    if (this.stockCount === 0) {
      this.inStock = false;
    }
    return this.save(); 
  }
  throw new Error('Insufficient stock');
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
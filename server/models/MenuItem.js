import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['Main Course', 'Bread', 'Rice', 'Beverage', 'Dessert', 'Appetizer', 'Snacks'],
    default: 'Main Course'
  },
  image: {
    url: String,
    alt: String
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  available: {
    type: Boolean,
    default: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ingredients: [{
    name: String,
    quantity: String
  }],
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number
  },
  dietary: {
    vegetarian: { type: Boolean, default: false },
    vegan: { type: Boolean, default: false },
    glutenFree: { type: Boolean, default: false },
    spicy: { type: Boolean, default: false },
    containsNuts: { type: Boolean, default: false }
  },
  tags: [String],
  preparationTime: {
    type: Number, // in minutes
    min: 1,
    max: 120
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
menuItemSchema.index({ category: 1 });
menuItemSchema.index({ vendor: 1 });
menuItemSchema.index({ available: 1, isActive: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });
menuItemSchema.index({ price: 1 });
menuItemSchema.index({ 'rating.average': -1 });

// Virtual for formatted price
menuItemSchema.virtual('formattedPrice').get(function() {
  return `₹${this.price}`;
});

// Virtual for stock status
menuItemSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out-of-stock';
  if (this.stock <= 5) return 'low-stock';
  if (this.stock <= 10) return 'medium-stock';
  return 'in-stock';
});

// Virtual for availability
menuItemSchema.virtual('isAvailable').get(function() {
  return this.available && this.isActive && this.stock > 0;
});

// Pre-save middleware to update availability based on stock
menuItemSchema.pre('save', function(next) {
  if (this.stock === 0) {
    this.available = false;
  }
  next();
});

// Static method to get available items
menuItemSchema.statics.getAvailableItems = function(vendorId = null) {
  const query = { 
    available: true, 
    isActive: true, 
    stock: { $gt: 0 } 
  };
  
  if (vendorId) {
    query.vendor = vendorId;
  }
  
  return this.find(query).populate('vendor', 'name email');
};

// Static method to get items by category
menuItemSchema.statics.getByCategory = function(category, vendorId = null) {
  const query = { 
    category, 
    available: true, 
    isActive: true, 
    stock: { $gt: 0 } 
  };
  
  if (vendorId) {
    query.vendor = vendorId;
  }
  
  return this.find(query).populate('vendor', 'name email');
};

// Static method to search items
menuItemSchema.statics.search = function(searchTerm, vendorId = null) {
  const query = {
    $and: [
      {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { tags: { $in: [new RegExp(searchTerm, 'i')] } }
        ]
      },
      { available: true, isActive: true, stock: { $gt: 0 } }
    ]
  };
  
  if (vendorId) {
    query.$and.push({ vendor: vendorId });
  }
  
  return this.find(query).populate('vendor', 'name email');
};

// Method to update stock
menuItemSchema.methods.updateStock = function(quantity, operation = 'subtract') {
  if (operation === 'subtract') {
    this.stock = Math.max(0, this.stock - quantity);
  } else if (operation === 'add') {
    this.stock += quantity;
  }
  
  // Update availability based on stock
  if (this.stock === 0) {
    this.available = false;
  } else if (this.stock > 0 && !this.available && this.isActive) {
    this.available = true;
  }
  
  return this.save();
};

// Method to update rating
menuItemSchema.methods.updateRating = function(newRating) {
  const totalRating = (this.rating.average * this.rating.count) + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  return this.save();
};

// Static method to create default menu items
menuItemSchema.statics.createDefaultItems = async function(vendorId) {
  const defaultItems = [
    {
      name: 'Butter Chicken',
      price: 250,
      category: 'Main Course',
      available: true,
      stock: 50,
      description: 'Creamy and rich butter chicken curry',
      vendor: vendorId,
      preparationTime: 20,
      dietary: { spicy: true }
    },
    {
      name: 'Naan',
      price: 40,
      category: 'Bread',
      available: true,
      stock: 100,
      description: 'Fresh baked naan bread',
      vendor: vendorId,
      preparationTime: 5,
      dietary: { vegetarian: true }
    },
    {
      name: 'Dal Makhani',
      price: 180,
      category: 'Main Course',
      available: true,
      stock: 30,
      description: 'Rich and creamy black lentil curry',
      vendor: vendorId,
      preparationTime: 15,
      dietary: { vegetarian: true }
    },
    {
      name: 'Biryani',
      price: 220,
      category: 'Rice',
      available: true,
      stock: 25,
      description: 'Aromatic basmati rice with spices',
      vendor: vendorId,
      preparationTime: 25,
      dietary: { spicy: true }
    },
    {
      name: 'Lassi',
      price: 60,
      category: 'Beverage',
      available: true,
      stock: 40,
      description: 'Refreshing yogurt-based drink',
      vendor: vendorId,
      preparationTime: 2,
      dietary: { vegetarian: true }
    }
  ];

  for (const itemData of defaultItems) {
    const existingItem = await this.findOne({ 
      name: itemData.name, 
      vendor: vendorId 
    });
    
    if (!existingItem) {
      await this.create(itemData);
      console.log(`Created default menu item: ${itemData.name}`);
    }
  }
};

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

export default MenuItem;

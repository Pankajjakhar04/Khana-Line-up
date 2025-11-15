import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  tokenId: {
    type: Number,
    required: true,
    // Use a non-unique index; tokens reset each day so they are not globally unique
    index: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    specialInstructions: String
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['ordered', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'ordered'
  },
  estimatedTime: {
    type: Number, // in minutes
    min: 0
  },
  actualTime: {
    type: Number // in minutes
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'wallet'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  notes: {
    customer: String,
    vendor: String,
    admin: String
  },
  timestamps: {
    ordered: { type: Date, default: Date.now },
    confirmed: Date,
    preparing: Date,
    ready: Date,
    completed: Date,
    cancelled: Date
  },
  rating: {
    food: { type: Number, min: 1, max: 5 },
    service: { type: Number, min: 1, max: 5 },
    overall: { type: Number, min: 1, max: 5 },
    comment: String,
    ratedAt: Date
  },
  delivery: {
    type: {
      type: String,
      enum: ['pickup', 'delivery'],
      default: 'pickup'
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      landmark: String
    },
    fee: { type: Number, default: 0 },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  discounts: [{
    type: String,
    amount: Number,
    percentage: Number,
    code: String
  }],
  tax: {
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ vendor: 1, status: 1, createdAt: -1 });
// Note: `tokenId` already has `unique: true` which creates an index automatically.
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'timestamps.ordered': -1 });

// Virtual for order duration
orderSchema.virtual('duration').get(function() {
  if (this.timestamps.completed && this.timestamps.ordered) {
    return Math.round((this.timestamps.completed - this.timestamps.ordered) / (1000 * 60)); // in minutes
  }
  return null;
});

// Virtual for formatted total amount
orderSchema.virtual('formattedTotal').get(function() {
  return `₹${this.totalAmount}`;
});

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
  const now = new Date();
  const diffMs = now - this.timestamps.ordered;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
});

// Pre-save middleware to calculate subtotals and total
orderSchema.pre('save', function(next) {
  // Calculate subtotals for items
  this.items.forEach(item => {
    item.subtotal = item.price * item.quantity;
  });
  
  // Calculate total amount
  const itemsTotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = this.discounts.reduce((sum, discount) => {
    if (discount.percentage) {
      return sum + (itemsTotal * discount.percentage / 100);
    }
    return sum + discount.amount;
  }, 0);
  
  this.totalAmount = itemsTotal - discountAmount + this.delivery.fee + this.tax.total;
  
  next();
});

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, notes = '') {
  const previousStatus = this.status;
  this.status = newStatus;
  
  // Update timestamp for the new status
  if (this.timestamps.hasOwnProperty(newStatus)) {
    this.timestamps[newStatus] = new Date();
  }
  
  // Calculate actual time when completed
  if (newStatus === 'completed' && this.timestamps.preparing) {
    this.actualTime = Math.round((this.timestamps.completed - this.timestamps.preparing) / (1000 * 60));
  }
  
  // Add vendor notes if provided
  if (notes) {
    this.notes.vendor = notes;
  }
  
  return this.save();
};

// Method to add rating
orderSchema.methods.addRating = function(ratingData) {
  this.rating = {
    ...ratingData,
    ratedAt: new Date()
  };
  return this.save();
};

// Static method to get orders by status
orderSchema.statics.getByStatus = function(status, vendorId = null) {
  const query = { status };
  if (vendorId) query.vendor = vendorId;
  
  return this.find(query)
    .populate('customer', 'name email phone')
    .populate('vendor', 'name email')
    .populate('items.menuItem', 'name category')
    .sort({ createdAt: -1 });
};

// Static method to get customer orders
orderSchema.statics.getCustomerOrders = function(customerId, limit = 20) {
  return this.find({ customer: customerId })
    .populate('vendor', 'name email')
    .populate('items.menuItem', 'name category')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get vendor orders
orderSchema.statics.getVendorOrders = function(vendorId, status = null, limit = 50) {
  const query = { vendor: vendorId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('customer', 'name email phone')
    .populate('items.menuItem', 'name category')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get next token ID (resets daily)
orderSchema.statics.getNextTokenId = async function() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Only consider orders from today when determining the next token
  const lastOrderToday = await this.findOne({ createdAt: { $gte: startOfToday } })
    .sort({ tokenId: -1 })
    .lean();

  return lastOrderToday ? (lastOrderToday.tokenId || 0) + 1 : 1;
};

// Static method for analytics
orderSchema.statics.getAnalytics = function(vendorId, startDate, endDate) {
  const matchQuery = { 
    vendor: vendorId,
    status: 'completed',
    'timestamps.completed': {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' },
        averagePreparationTime: { $avg: '$actualTime' }
      }
    }
  ]);
};

// Static method to get popular items
orderSchema.statics.getPopularItems = function(vendorId, startDate, endDate, limit = 10) {
  const matchQuery = { 
    vendor: vendorId,
    status: 'completed',
    'timestamps.completed': {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  return this.aggregate([
    { $match: matchQuery },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.menuItem',
        itemName: { $first: '$items.name' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'menuitems',
        localField: '_id',
        foreignField: '_id',
        as: 'menuItem'
      }
    }
  ]);
};

const Order = mongoose.model('Order', orderSchema);

export default Order;

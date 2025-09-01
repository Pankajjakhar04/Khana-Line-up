import express from 'express';
import { Order, MenuItem } from '../models/index.js';
import socketEvents from '../config/socket.js';

const router = express.Router();

// @route   GET /api/orders
// @desc    Get all orders with filters
// @access  Public (should be protected in production)
router.get('/', async (req, res) => {
  try {
    const { 
      customer, 
      vendor, 
      status, 
      limit = 50, 
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let query = {};
    
    if (customer) query.customer = customer;
    if (vendor) query.vendor = vendor;
    if (status) query.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const orders = await Order.find(query)
      .populate('customer', 'name email phone')
      .populate('vendor', 'name email')
      .populate('items.menuItem', 'name category price')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));
    
    res.json({
      success: true,
      count: orders.length,
      totalOrders,
      totalPages,
      currentPage: parseInt(page),
      orders
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Public (should be protected in production)
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone address')
      .populate('vendor', 'name email phone address')
      .populate('items.menuItem', 'name category price description');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Public (should be protected in production)
router.post('/', async (req, res) => {
  try {
    const { customer, vendor, items, notes, delivery } = req.body;
    
    // Validation
    if (!customer || !vendor || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer, vendor, and items are required'
      });
    }

    // Verify all menu items exist and are available
    const menuItemIds = items.map(item => item.menuItem);
    const menuItems = await MenuItem.find({
      _id: { $in: menuItemIds },
      available: true,
      isActive: true
    });

    if (menuItems.length !== items.length) {
      return res.status(400).json({
        success: false,
        message: 'Some menu items are not available'
      });
    }

    // Check stock availability
    for (const orderItem of items) {
      const menuItem = menuItems.find(item => item._id.toString() === orderItem.menuItem);
      if (menuItem.stock < orderItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${menuItem.name}. Available: ${menuItem.stock}, Requested: ${orderItem.quantity}`
        });
      }
    }

    // Calculate totals and prepare order items
    const orderItems = items.map(orderItem => {
      const menuItem = menuItems.find(item => item._id.toString() === orderItem.menuItem);
      return {
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: orderItem.quantity,
        subtotal: menuItem.price * orderItem.quantity,
        specialInstructions: orderItem.specialInstructions
      };
    });

    // Get next token ID
    const tokenId = await Order.getNextTokenId();

    // Create order
    const orderData = {
      tokenId,
      customer,
      vendor,
      items: orderItems,
      totalAmount: orderItems.reduce((sum, item) => sum + item.subtotal, 0),
      status: 'ordered'
    };

    if (notes) {
      orderData.notes = { customer: notes };
    }

    if (delivery) {
      orderData.delivery = delivery;
    }

    const order = new Order(orderData);
    await order.save();

    // Update stock for all items
    for (const orderItem of items) {
      const menuItem = menuItems.find(item => item._id.toString() === orderItem.menuItem);
      await menuItem.updateStock(orderItem.quantity, 'subtract');
    }

    // Populate the order for response
    await order.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'vendor', select: 'name email' },
      { path: 'items.menuItem', select: 'name category' }
    ]);

    // Emit socket event for new order
    socketEvents.orderCreated(order);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/orders/:id
// @desc    Update order details (like estimated time)
// @access  Public (should be protected in production)
router.put('/:id', async (req, res) => {
  try {
    const { estimatedTime, notes } = req.body;
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update only allowed fields
    const updateData = {};
    if (estimatedTime !== undefined) {
      updateData.estimatedTime = parseInt(estimatedTime) || 0;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'vendor', select: 'name email' },
      { path: 'items.menuItem', select: 'name category' }
    ]);

    res.json({
      success: true,
      message: 'Order updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Public (should be protected in production)
router.put('/:id/status', async (req, res) => {
  try {
    const { status, notes, estimatedTime } = req.body;
    
    const validStatuses = ['ordered', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update estimated time if provided
    if (estimatedTime !== undefined) {
      order.estimatedTime = estimatedTime;
    }

    await order.updateStatus(status, notes);
    
    await order.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'vendor', select: 'name email' },
      { path: 'items.menuItem', select: 'name category' }
    ]);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating order status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/orders/:id/rating
// @desc    Add rating to order
// @access  Public (should be protected in production)
router.put('/:id/rating', async (req, res) => {
  try {
    const { food, service, overall, comment } = req.body;
    
    if (!food || !service || !overall) {
      return res.status(400).json({
        success: false,
        message: 'Food, service, and overall ratings are required'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed orders'
      });
    }

    await order.addRating({ food, service, overall, comment });
    
    res.json({
      success: true,
      message: 'Rating added successfully',
      order
    });

  } catch (error) {
    console.error('Add rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding rating',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/orders/customer/:customerId
// @desc    Get orders for a customer
// @access  Public (should be protected in production)
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { limit = 20, status } = req.query;
    
    let query = { customer: req.params.customerId };
    if (status) query.status = status;
    
    const orders = await Order.find(query)
      .populate('vendor', 'name email')
      .populate('items.menuItem', 'name category')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: orders.length,
      orders
    });

  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching customer orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/orders/vendor/:vendorId
// @desc    Get orders for a vendor
// @access  Public (should be protected in production)
router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const { limit = 50, status } = req.query;
    
    let query = { vendor: req.params.vendorId };
    if (status) query.status = status;
    
    const orders = await Order.find(query)
      .populate('customer', 'name email phone')
      .populate('items.menuItem', 'name category')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: orders.length,
      orders
    });

  } catch (error) {
    console.error('Get vendor orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching vendor orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/orders/analytics/:vendorId
// @desc    Get analytics for a vendor
// @access  Public (should be protected in production)
router.get('/analytics/:vendorId', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const endDate = new Date();
    
    const analytics = await Order.getAnalytics(req.params.vendorId, startDate, endDate);
    const popularItems = await Order.getPopularItems(req.params.vendorId, startDate, endDate);
    
    res.json({
      success: true,
      period: {
        startDate,
        endDate,
        days: parseInt(days)
      },
      analytics: analytics[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        averagePreparationTime: 0
      },
      popularItems
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PATCH /api/orders/:id/cancel
// @desc    Cancel order by customer
// @access  Public (should be protected in production)
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { reason, cancelledBy } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed or already cancelled orders'
      });
    }

    // Restore stock for cancelled orders
    if (order.status !== 'cancelled') {
      for (const item of order.items) {
        const menuItem = await MenuItem.findById(item.menuItem);
        if (menuItem) {
          await menuItem.updateStock(item.quantity, 'add');
        }
      }
    }

    // Update order status to cancelled
    order.status = 'cancelled';
    order.timestamps.cancelled = new Date();
    if (reason) {
      if (cancelledBy === 'customer') {
        order.notes.customer = `Cancelled by customer: ${reason}`;
      } else {
        order.notes.vendor = `Cancelled: ${reason}`;
      }
    }
    
    await order.save();

    // Populate the order before sending response
    await order.populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'vendor', select: 'name email' },
      { path: 'items.menuItem', select: 'name category price' }
    ]);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Delete order permanently
// @access  Public (should be protected in production)
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Restore stock for deleted orders if they weren't completed
    if (order.status !== 'completed' && order.status !== 'cancelled') {
      for (const item of order.items) {
        const menuItem = await MenuItem.findById(item.menuItem);
        if (menuItem) {
          await menuItem.updateStock(item.quantity, 'add');
        }
      }
    }

    // Permanently delete the order
    await Order.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

import express from 'express';
import { MenuItem } from '../models/index.js';

const router = express.Router();

// @route   GET /api/menu
// @desc    Get all available menu items
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, search, vendor, sortBy, limit = 50, page = 1 } = req.query;
    
    let query = { available: true, isActive: true, stock: { $gt: 0 } };
    
    // Filter by vendor
    if (vendor) {
      query.vendor = vendor;
    }
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Sorting
    let sortOptions = {};
    switch (sortBy) {
      case 'price-low':
        sortOptions.price = 1;
        break;
      case 'price-high':
        sortOptions.price = -1;
        break;
      case 'rating':
        sortOptions['rating.average'] = -1;
        break;
      case 'popular':
        sortOptions['rating.count'] = -1;
        break;
      default:
        sortOptions.createdAt = -1;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const items = await MenuItem.find(query)
      .populate('vendor', 'name email phone address restaurantName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const totalItems = await MenuItem.countDocuments(query);
    const totalPages = Math.ceil(totalItems / parseInt(limit));
    
    res.json({
      success: true,
      count: items.length,
      totalItems,
      totalPages,
      currentPage: parseInt(page),
      items
    });

  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching menu items',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/menu/categories
// @desc    Get all available categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await MenuItem.distinct('category', {
      available: true,
      isActive: true,
      stock: { $gt: 0 }
    });
    
    res.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/menu/:id
// @desc    Get menu item by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id)
      .populate('vendor', 'name email phone address restaurantName')
      .lean();
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      item
    });

  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching menu item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/menu
// @desc    Create new menu item (vendor only)
// @access  Public (should be protected in production)
router.post('/', async (req, res) => {
  try {
    const itemData = req.body;
    
    // Validation
    if (!itemData.name || !itemData.price || !itemData.category || !itemData.vendor) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, category, and vendor are required'
      });
    }

    // Check if item with same name exists for this vendor (only active items)
    const existingItem = await MenuItem.findOne({
      name: itemData.name,
      vendor: itemData.vendor,
      isActive: true  // Only check active items
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'An item with this name already exists in your menu'
      });
    }

    const item = new MenuItem(itemData);
    await item.save();
    
    await item.populate('vendor', 'name email restaurantName');

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      item
    });

  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating menu item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/menu/:id
// @desc    Update menu item
// @access  Public (should be protected in production)
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.vendor;
    delete updates.createdAt;
    delete updates.updatedAt;

    // If name is being updated, check for conflicts with active items
    if (updates.name) {
      const currentItem = await MenuItem.findById(req.params.id);
      if (!currentItem) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found'
        });
      }

      // Only check if the name is actually changing
      if (updates.name !== currentItem.name) {
        const existingItem = await MenuItem.findOne({
          name: updates.name,
          vendor: currentItem.vendor,
          isActive: true,
          _id: { $ne: req.params.id } // Exclude current item
        });

        if (existingItem) {
          return res.status(400).json({
            success: false,
            message: 'An item with this name already exists in your menu'
          });
        }
      }
    }

    const item = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('vendor', 'name email restaurantName');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      item
    });

  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating menu item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/menu/:id/stock
// @desc    Update item stock
// @access  Public (should be protected in production)
router.put('/:id/stock', async (req, res) => {
  try {
    const { quantity, operation = 'subtract' } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }

    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    await item.updateStock(quantity, operation);
    await item.populate('vendor', 'name email');

    res.json({
      success: true,
      message: 'Stock updated successfully',
      item
    });

  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating stock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/menu/:id/rating
// @desc    Add rating to menu item
// @access  Public (should be protected in production)
router.put('/:id/rating', async (req, res) => {
  try {
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    await item.updateRating(rating);
    await item.populate('vendor', 'name email');

    res.json({
      success: true,
      message: 'Rating added successfully',
      item
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

// @route   PUT /api/menu/:id/toggle
// @desc    Toggle item availability
// @access  Public (should be protected in production)
router.put('/:id/toggle', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    item.available = !item.available;
    await item.save();
    await item.populate('vendor', 'name email');

    res.json({
      success: true,
      message: `Item ${item.available ? 'enabled' : 'disabled'} successfully`,
      item
    });

  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error toggling availability',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/menu/:id
// @desc    Delete menu item (soft delete)
// @access  Public (should be protected in production)
router.delete('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });

  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting menu item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/menu/:id/restore
// @desc    Restore deleted menu item
// @access  Public (should be protected in production)
router.put('/:id/restore', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    if (item.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Menu item is already active'
      });
    }

    // Check if restoring would create a name conflict
    const existingActiveItem = await MenuItem.findOne({
      name: item.name,
      vendor: item.vendor,
      isActive: true,
      _id: { $ne: item._id }
    });

    if (existingActiveItem) {
      return res.status(400).json({
        success: false,
        message: 'Cannot restore: An active item with this name already exists in your menu'
      });
    }

    // Restore the item
    item.isActive = true;
    await item.save();
    
    await item.populate('vendor', 'name email restaurantName');

    res.json({
      success: true,
      message: 'Menu item restored successfully',
      item
    });

  } catch (error) {
    console.error('Restore menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error restoring menu item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/menu/vendor/:vendorId
// @desc    Get all menu items for a vendor
// @access  Public
router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const { includeInactive = false } = req.query;
    
    let query = { vendor: req.params.vendorId };
    if (!includeInactive) {
      query.isActive = true;
    }

    const items = await MenuItem.find(query)
      .populate('vendor', 'name email phone address restaurantName')
      .sort({ category: 1, name: 1 })
      .lean();

    res.json({
      success: true,
      count: items.length,
      items
    });

  } catch (error) {
    console.error('Get vendor menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching vendor menu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

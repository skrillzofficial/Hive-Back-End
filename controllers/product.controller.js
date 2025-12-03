const Product = require("../models/product");
const {
  uploadMultipleImages,
  validateImageFiles,
  deleteFromCloudinary,
} = require("../utils/imageUpload");

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getAllProducts = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      minPrice,
      maxPrice,
      inStock,
      tags,
      search,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    // Build filter object
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (inStock === "true") filter.inStock = true;
    if (tags) filter.tags = { $in: tags.split(",") };

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [search.toLowerCase()] } },
      ];
    }

    // Sort options
    let sortOption = {};
    switch (sort) {
      case "price-asc":
        sortOption = { price: 1 };
        break;
      case "price-desc":
        sortOption = { price: -1 };
        break;
      case "name-asc":
        sortOption = { name: 1 };
        break;
      case "name-desc":
        sortOption = { name: -1 };
        break;
      case "newest":
        sortOption = { createdAt: -1 };
        break;
      case "rating":
        sortOption = { rating: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    // Pagination
    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .sort(sortOption)
      .limit(Number(limit))
      .skip(skip);

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single product by ID or slug
// @route   GET /api/products/:identifier
// @access  Public
const getProduct = async (req, res) => {
  try {
    const { identifier } = req.params;

    let product;

    // Check if identifier is MongoDB ObjectId or custom id or slug
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(identifier);
    } else {
      product = await Product.findOne({
        $or: [{ id: identifier }, { slug: identifier }],
        isActive: true,
      });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get featured/bestseller products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = req.query.limit || 8;
    const products = await Product.getFeatured(Number(limit));

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get new arrival products
// @route   GET /api/products/new-arrivals
// @access  Public
const getNewArrivals = async (req, res) => {
  try {
    const limit = req.query.limit || 8;
    const products = await Product.getNewArrivals(Number(limit));

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get sale products
// @route   GET /api/products/sale
// @access  Public
const getSaleProducts = async (req, res) => {
  try {
    const products = await Product.getSaleProducts();

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.getByCategory(category);

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get products by subcategory
// @route   GET /api/products/subcategory/:subcategory
// @access  Public
const getProductsBySubcategory = async (req, res) => {
  try {
    const { subcategory } = req.params;
    const products = await Product.getBySubcategory(subcategory);

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Please provide a search query",
      });
    }

    const products = await Product.searchProducts(q);

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============= ADMIN ONLY ROUTES =============

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const {
      id,
      name,
      slug,
      category,
      subcategory,
      price,
      salePrice,
      currency,
      inStock,
      stockCount,
      sizes,
      colors,
      description,
      features,
      material,
      care,
      madeIn,
      rating,
      reviews,
      tags,
    } = req.body;

    // Handle image uploads
    let imageUrls = [];

    if (req.files && req.files.images) {
      const files = validateImageFiles(req.files.images);
      imageUrls = await uploadMultipleImages(files);
    } else if (req.body.images) {
      // If images are provided as URLs (array of strings)
      imageUrls = Array.isArray(req.body.images)
        ? req.body.images
        : [req.body.images];
    }

    if (imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one product image",
      });
    }

    // Check if product with same id or slug already exists
    const productExists = await Product.findOne({
      $or: [{ id }, { slug }],
    });

    if (productExists) {
      return res.status(400).json({
        success: false,
        message: "Product with this ID or slug already exists",
      });
    }

    const product = await Product.create({
      id,
      name,
      slug,
      category,
      subcategory,
      price,
      salePrice,
      currency,
      inStock,
      stockCount,
      images: imageUrls,
      sizes,
      colors,
      description,
      features,
      material,
      care,
      madeIn,
      rating,
      reviews,
      tags,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let imageUrls = [...product.images]; 

    // Handle complete image replacement first
    if (req.body.replaceImages === 'true' || req.body.replaceImages === true) {
      if (req.body.images) {
        imageUrls = Array.isArray(req.body.images)
          ? req.body.images
          : [req.body.images];
      }
    } else {
      // Handle image removal
      if (req.body.imagesToRemove) {
        const toRemove = Array.isArray(req.body.imagesToRemove)
          ? req.body.imagesToRemove
          : [req.body.imagesToRemove];

        // Delete from Cloudinary
        for (const imageUrl of toRemove) {
          try {
            await deleteFromCloudinary(imageUrl);
          } catch (err) {
            console.error('Failed to delete image from Cloudinary:', err);
          }
        }

        // Remove from array
        imageUrls = imageUrls.filter((url) => !toRemove.includes(url));
      }

      // Handle new image uploads (add to existing)
      if (req.files && req.files.images) {
        const files = validateImageFiles(req.files.images);
        const newImageUrls = await uploadMultipleImages(files);
        imageUrls = [...imageUrls, ...newImageUrls];
      }
    }

    const updateData = {
      ...req.body,
      images: imageUrls,
    };

    // Remove helper fields before saving
    delete updateData.imagesToRemove;
    delete updateData.replaceImages;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Update product error:', error); 
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
// @desc    Delete product (soft delete)
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Soft delete - just set isActive to false
    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Permanently delete product
// @route   DELETE /api/products/:id/permanent
// @access  Private/Admin
const permanentDeleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product permanently deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update product stock
// @route   PATCH /api/products/:id/stock
// @access  Private/Admin
const updateProductStock = async (req, res) => {
  try {
    const { stockCount, inStock } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (stockCount !== undefined) product.stockCount = stockCount;
    if (inStock !== undefined) product.inStock = inStock;

    // Auto update inStock based on stockCount
    if (stockCount === 0) product.inStock = false;
    if (stockCount > 0 && inStock === undefined) product.inStock = true;

    await product.save();

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Check product availability
// @route   GET /api/products/:id/availability
// @access  Public
const checkProductAvailability = async (req, res) => {
  try {
    const { quantity = 1 } = req.query;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const available = product.isAvailable() && product.stockCount >= quantity;

    res.status(200).json({
      success: true,
      data: {
        available,
        inStock: product.inStock,
        stockCount: product.stockCount,
        requestedQuantity: Number(quantity),
        canFulfill: product.stockCount >= quantity,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// @desc    Upload product images
// @route   POST /api/products/upload-images
// @access  Private/Admin
const uploadProductImages = async (req, res) => {
  try {
    if (!req.files || !req.files.images) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image",
      });
    }

    // Validate and prepare files
    const files = validateImageFiles(req.files.images);

    // Upload to Cloudinary
    const imageUrls = await uploadMultipleImages(files);

    res.status(200).json({
      success: true,
      message: "Images uploaded successfully",
      images: imageUrls,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  // Public routes
  getAllProducts,
  getProduct,
  getFeaturedProducts,
  getNewArrivals,
  getSaleProducts,
  getProductsByCategory,
  getProductsBySubcategory,
  searchProducts,
  checkProductAvailability,

  // Admin routes
  createProduct,
  updateProduct,
  deleteProduct,
  permanentDeleteProduct,
  updateProductStock,
  uploadProductImages,

};

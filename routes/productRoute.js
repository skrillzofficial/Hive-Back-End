const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProduct,
  getFeaturedProducts,
  getNewArrivals,
  getSaleProducts,
  getProductsByCategory,
  getProductsBySubcategory,
  searchProducts,
  checkProductAvailability,
  createProduct,
  updateProduct,
  deleteProduct,
  permanentDeleteProduct,
  updateProductStock,
  uploadProductImages, 
  purchaseProduct,
} = require("../controllers/product.controller");

const { protect, authorize } = require("../middlewares/auth");

// PUBLIC ROUTES - SPECIFIC ROUTES FIRST!
router.get("/search", searchProducts);
router.get("/featured", getFeaturedProducts);
router.get("/new-arrivals", getNewArrivals);
router.get("/sale", getSaleProducts);
router.get("/all", getAllProducts); 

// Category routes
router.get("/category/:category", getProductsByCategory);
router.get("/subcategory/:subcategory", getProductsBySubcategory);

// Availability check (specific pattern)
router.get("/:id/availability", checkProductAvailability);

// ADMIN ROUTES 
router.post("/upload-images", protect, authorize("admin"), uploadProductImages); 
router.post("/create", protect, authorize("admin"), createProduct);
router.put("/:id", protect, authorize("admin"), updateProduct);
router.patch("/:id/stock", protect, authorize("admin"), updateProductStock);
router.delete("/:id/permanent", protect, authorize("admin"), permanentDeleteProduct);
router.delete("/:id", protect, authorize("admin"), deleteProduct);

// USER ROUTES 
router.post("/:id/purchase", protect, purchaseProduct);

// Get single product 
router.get("/:identifier", getProduct);

module.exports = router;
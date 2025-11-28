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
  purchaseProduct,
} = require("../controllers/product.controller");

const { protect, authorize } = require("../middlewares/auth");

// PUBLIC ROUTES
router.get("/search", searchProducts);
router.get("/featured", getFeaturedProducts);
router.get("/new-arrivals", getNewArrivals);
router.get("/sale", getSaleProducts);

// Category routes
router.get("/category/:category", getProductsByCategory);
router.get("/subcategory/:subcategory", getProductsBySubcategory);

// Get all products (specific route)
router.get("/all", getAllProducts);

// Availability check (specific pattern)
router.get("/:id/availability", checkProductAvailability);

// Get single product
router.get("/:identifier", getProduct);

//  USER ROUTES 
router.post("/:id/purchase", protect, purchaseProduct);

//  ADMIN ROUTES 
router.post("/create", protect, authorize("admin"), createProduct);
router.put("/:id", protect, authorize("admin"), updateProduct);
router.patch("/:id/stock", protect, authorize("admin"), updateProductStock);
router.delete("/:id", protect, authorize("admin"), deleteProduct);
router.delete("/:id/permanent", protect, authorize("admin"), permanentDeleteProduct);

module.exports = router;
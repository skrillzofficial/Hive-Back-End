const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;

// Upload single image to Cloudinary
const uploadToCloudinary = async (file, folder = 'hive/products') => {
  try {
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder,
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto' }
      ]
    });
    
    // Delete temp file
    await fs.unlink(file.tempFilePath);
    
    return result.secure_url;
  } catch (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

// Upload multiple images
const uploadMultipleImages = async (files, folder = 'hive/products') => {
  try {
    const uploadPromises = files.map(file => uploadToCloudinary(file, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    throw new Error(`Multiple image upload failed: ${error.message}`);
  }
};

// Delete image from Cloudinary
const deleteFromCloudinary = async (imageUrl) => {
  try {
    // Extract public_id from URL
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1];
    const publicId = `hive/products/${filename.split('.')[0]}`;
    
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    throw new Error(`Image deletion failed: ${error.message}`);
  }
};

// Validate image files
const validateImageFiles = (files) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  const filesArray = Array.isArray(files) ? files : [files];
  
  for (const file of filesArray) {
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Only JPEG, PNG, and WebP images are allowed');
    }
    if (file.size > maxSize) {
      throw new Error(`File ${file.name} exceeds 10MB limit`);
    }
  }
  
  return filesArray;
};

module.exports = {
  uploadToCloudinary,
  uploadMultipleImages,
  deleteFromCloudinary,
  validateImageFiles,
};
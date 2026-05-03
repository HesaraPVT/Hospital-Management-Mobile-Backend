/*const Service = require('../models/service.model');
const asyncHandler = require('../utils/asyncHandler');

exports.createService = asyncHandler(async (req, res) => {
  const { serviceName, description, price, duration, availabilityStatus } = req.body;

  if (!serviceName || !description || price === undefined || duration === undefined) {
    return res.status(400).json({ message: 'Service name, description, price and duration are required' });
  }

  const service = await Service.create({
    serviceName,
    description,
    price,
    duration,
    availabilityStatus: availabilityStatus !== undefined ? availabilityStatus : true,
  });

  res.status(201).json(service);
});

exports.getServices = asyncHandler(async (req, res) => {
  const services = await Service.find();
  res.status(200).json(services);
});

exports.getServiceById = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) {
    return res.status(404).json({ message: 'Service not found' });
  }
  res.status(200).json(service);
});

exports.updateService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) {
    return res.status(404).json({ message: 'Service not found' });
  }

  const updates = {};
  if (req.body.serviceName !== undefined) updates.serviceName = req.body.serviceName;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.price !== undefined) updates.price = req.body.price;
  if (req.body.duration !== undefined) updates.duration = req.body.duration;
  if (req.body.availabilityStatus !== undefined) updates.availabilityStatus = req.body.availabilityStatus;

  Object.assign(service, updates);
  await service.save();

  res.status(200).json(service);
});

exports.deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) {
    return res.status(404).json({ message: 'Service not found' });
  }

  await service.remove();
  res.status(200).json({ message: 'Service deleted successfully' });
});*/





/*const Service = require('../models/service.model');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Add a new hospital service
// @route   POST /api/services
exports.createService = asyncHandler(async (req, res) => {
    const { serviceName, description, price, duration, availabilityStatus } = req.body;

    // Validate mandatory fields
    const requiredFields = ['serviceName', 'description', 'price', 'duration'];
    for (const field of requiredFields) {
        if (req.body[field] === undefined || req.body[field] === null) {
            return res.status(400).json({ 
                success: false, 
                message: `Please provide the following field: ${field}` 
            });
        }
    }

    const newService = await Service.create({
        serviceName,
        description,
        price,
        duration,
        availabilityStatus: availabilityStatus ?? true, // Using Nullish coalescing operator
    });

    res.status(201).json({ success: true, data: newService });
});

// @desc    Retrieve all services
// @route   GET /api/services
exports.getServices = asyncHandler(async (req, res) => {
    const data = await Service.find().lean(); // Use .lean() for better performance if just reading
    res.status(200).json({ success: true, count: data.length, data });
});

// @desc    Get single service details
// @route   GET /api/services/:id
exports.getServiceById = asyncHandler(async (req, res) => {
    const entry = await Service.findById(req.params.id);
    
    if (!entry) {
        return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    
    res.status(200).json({ success: true, data: entry });
});

// @desc    Modify existing service info
// @route   PUT /api/services/:id
exports.updateService = asyncHandler(async (req, res) => {
    // Instead of find + save, use findByIdAndUpdate for a cleaner look
    const updatedService = await Service.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { new: true, runValidators: true }
    );

    if (!updatedService) {
        return res.status(404).json({ success: false, message: 'Update failed: Service not found' });
    }

    res.status(200).json({ success: true, data: updatedService });
});

// @desc    Remove service from system
// @route   DELETE /api/services/:id
exports.deleteService = asyncHandler(async (req, res) => {
    const result = await Service.findByIdAndDelete(req.params.id);

    if (!result) {
        return res.status(404).json({ success: false, message: 'Deletion failed: Service not found' });
    }

    res.status(200).json({ success: true, message: 'Service removed successfully' });
});
*/




/*const Service = require('../models/service.model');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Add a new hospital service
// @route   POST /api/services
exports.createService = asyncHandler(async (req, res) => {
    const { serviceName, description, price, duration, availabilityStatus } = req.body;

    // Validate mandatory fields
    const requiredFields = ['serviceName', 'description', 'price', 'duration'];
    for (const field of requiredFields) {
        if (req.body[field] === undefined || req.body[field] === null) {
            return res.status(400).json({ 
                success: false, 
                message: `Please provide the following field: ${field}` 
            });
        }
    }

    const newService = await Service.create({
        serviceName,
        description,
        price,
        duration,
        availabilityStatus: availabilityStatus ?? true, 
    });

    res.status(201).json({ success: true, data: newService });
});

// @desc    Retrieve all services
// @route   GET /api/services
exports.getServices = asyncHandler(async (req, res) => {
    const data = await Service.find().lean(); 
    res.status(200).json({ success: true, count: data.length, data });
});

// @desc    Get single service details
// @route   GET /api/services/:id
exports.getServiceById = asyncHandler(async (req, res) => {
    const entry = await Service.findById(req.params.id);
    
    if (!entry) {
        return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    
    res.status(200).json({ success: true, data: entry });
});

// @desc    Modify existing service info
// @route   PUT /api/services/:id
exports.updateService = asyncHandler(async (req, res) => {
    // FIX APPLIED HERE: Changed { new: true } to { returnDocument: 'after' }
    const updatedService = await Service.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { returnDocument: 'after', runValidators: true }
    );

    if (!updatedService) {
        return res.status(404).json({ success: false, message: 'Update failed: Service not found' });
    }

    res.status(200).json({ success: true, data: updatedService });
});

// @desc    Remove service from system
// @route   DELETE /api/services/:id
exports.deleteService = asyncHandler(async (req, res) => {
    const result = await Service.findByIdAndDelete(req.params.id);

    if (!result) {
        return res.status(404).json({ success: false, message: 'Deletion failed: Service not found' });
    }

    res.status(200).json({ success: true, message: 'Service removed successfully' });
});*/





const Service = require('../models/service.model');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Add a new hospital service
// @route   POST /api/services
exports.createService = asyncHandler(async (req, res) => {
    // UPDATED: Destructure 'category' from the request body
    const { serviceName, description, price, duration, availabilityStatus, category } = req.body;

    console.log('🔧 [SERVICE] POST /services - Creating service:', { serviceName, category });

    // UPDATED: Added 'category' to mandatory validation
    const requiredFields = ['serviceName', 'description', 'price', 'duration'];
    for (const field of requiredFields) {
        if (req.body[field] === undefined || req.body[field] === null) {
            console.error(`❌ [SERVICE] Missing required field: ${field}`);
            return res.status(400).json({ 
                success: false, 
                message: `Please provide the following field: ${field}` 
            });
        }
    }

    const newService = await Service.create({
        serviceName,
        description,
        price,
        duration,
        category: category || 'General', // UPDATED: Use provided category or default to 'General'
        availabilityStatus: availabilityStatus ?? true, 
    });

    console.log('✅ [SERVICE] Service created:', newService._id);
    res.status(201).json({ success: true, data: newService });
});

// @desc    Retrieve all services
// @route   GET /api/services
exports.getServices = asyncHandler(async (req, res) => {
    console.log('🔧 [SERVICE] GET /services - Fetching all services...');
    const data = await Service.find().lean(); 
    console.log(`🔧 [SERVICE] Found ${data.length} services`);
    res.status(200).json(data);
});

// @desc    Get single service details
// @route   GET /api/services/:id
exports.getServiceById = asyncHandler(async (req, res) => {
    const entry = await Service.findById(req.params.id);
    
    if (!entry) {
        return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    
    res.status(200).json(entry);
});

// @desc    Modify existing service info
// @route   PUT /api/services/:id
exports.updateService = asyncHandler(async (req, res) => {
    const updatedService = await Service.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { returnDocument: 'after', runValidators: true }
    );

    if (!updatedService) {
        return res.status(404).json({ success: false, message: 'Update failed: Service not found' });
    }

    res.status(200).json(updatedService);
});

// @desc    Remove service from system
// @route   DELETE /api/services/:id
exports.deleteService = asyncHandler(async (req, res) => {
    const result = await Service.findByIdAndDelete(req.params.id);

    if (!result) {
        return res.status(404).json({ success: false, message: 'Deletion failed: Service not found' });
    }

    res.status(200).json({ success: true, message: 'Service removed successfully' });
});
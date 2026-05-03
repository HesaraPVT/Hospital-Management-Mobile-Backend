/*const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    serviceName: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: Number, required: true },
    availabilityStatus: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);*/



/*const mongoose = require('mongoose');

/**
 * Service Schema for Hospital Management System
 * Defines the structure for healthcare offerings/treatments
 *//*
const HospitalServiceSchema = new mongoose.Schema(
    {
        serviceName: {
            type: String,
            required: [true, 'Service name is mandatory'],
            trim: true, // Removes accidental whitespace
        },
        description: {
            type: String,
            required: [true, 'Please provide a service description'],
        },
        price: {
            type: Number,
            required: [true, 'Pricing must be defined'],
            min: [0, 'Price cannot be negative'],
        },
        duration: {
            type: Number,
            required: [true, 'Standard duration (in minutes) is required'],
        },
        availabilityStatus: {
            type: Boolean,
            default: true,
        },
    },
    { 
        timestamps: true,
        versionKey: false // Removes the __v field from the database
    }
);

// Creating an index on serviceName to speed up searches
HospitalServiceSchema.index({ serviceName: 'text' });

module.exports = mongoose.model('HealthcareService', HospitalServiceSchema);*/





const mongoose = require('mongoose');

/**
 * Service Schema for Hospital Management System
 * Defines the structure for healthcare offerings/treatments
 */
const HospitalServiceSchema = new mongoose.Schema(
    {
        serviceName: {
            type: String,
            required: [true, 'Service name is mandatory'],
            trim: true,
        },
        // ADDED: Category field with validation
        category: {
            type: String,
            enum: ['Laboratory', 'Radiology', 'Consultation', 'General', 'Emergency'],
            default: 'General'
        },
        description: {
            type: String,
            required: [true, 'Please provide a service description'],
        },
        price: {
            type: Number,
            required: [true, 'Pricing must be defined'],
            min: [0, 'Price cannot be negative'],
        },
        duration: {
            type: Number,
            required: [true, 'Standard duration (in minutes) is required'],
        },
        availabilityStatus: {
            type: Boolean,
            default: true,
        },
    },
    { 
        timestamps: true,
        versionKey: false 
    }
);

// Creating an index on serviceName to speed up searches
HospitalServiceSchema.index({ serviceName: 'text' });

// We use 'Service' to match the controller import/reference
module.exports = mongoose.model('Service', HospitalServiceSchema, 'services');

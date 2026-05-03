const mongoose = require('mongoose');

const connectDB = async () => {
  let retries = 5;

  while (retries) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('MongoDB Connected');
      break;
    } catch (err) {
      console.log('MongoDB connection failed. Retrying...', retries);
      retries--;

      if (retries === 0) {
        console.error('MongoDB connection failed permanently');
        process.exit(1);
      }

      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

module.exports = connectDB;
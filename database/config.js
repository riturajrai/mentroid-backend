const mongoose = require('mongoose');

const DatabaseConnection = async () => {
  try {
    // Always include a specific DB name — e.g. 'authDB'
    const MONGO_URI = process.env.MONGO_URI || 
      'mongodb+srv://hello_db_user:H2NlwRWLhhSi47IB@cluster0.dnmdce5.mongodb.net/authDB?retryWrites=true&w=majority';

    // New mongoose.connect syntax (no deprecated options)
    const conn = await mongoose.connect(MONGO_URI, {
      dbName: 'authDB',
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = DatabaseConnection;

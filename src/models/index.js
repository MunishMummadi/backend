import sequelize from '../config/database.js';
import Provider from './Provider.js';
import Review from './Review.js';
import SmsSubscription from './SmsSubscription.js';
import SavedProvider from './SavedProvider.js';

// Set up associations
Provider.hasMany(Review, { foreignKey: 'providerId' });
Review.belongsTo(Provider, { foreignKey: 'providerId' });

Provider.hasMany(SavedProvider, { foreignKey: 'providerId' });
SavedProvider.belongsTo(Provider, { foreignKey: 'providerId' });

// Function to initialize database
export const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync all models with the database
    await sequelize.sync({ alter: true });
    console.log('All models synchronized with database.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

export { Provider, Review, SmsSubscription, SavedProvider };
export default sequelize;

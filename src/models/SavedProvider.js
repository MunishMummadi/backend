import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SavedProvider = sequelize.define('SavedProvider', {
  anonymousId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  providerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Providers',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['anonymousId'] }
  ]
});

export default SavedProvider;

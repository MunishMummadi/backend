import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Review = sequelize.define('Review', {
  providerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Providers',
      key: 'id'
    }
  },
  placeId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  source: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['google', 'reddit', 'other']]
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  author: {
    type: DataTypes.STRING
  },
  rating: {
    type: DataTypes.FLOAT,
    validate: {
      min: 0,
      max: 5
    }
  },
  sentiment: {
    type: DataTypes.STRING,
    validate: {
      isIn: [['positive', 'neutral', 'negative']]
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['providerId', 'source']
    }
  ]
});

export default Review;

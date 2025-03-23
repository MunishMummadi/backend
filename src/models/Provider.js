import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Provider = sequelize.define('Provider', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING
  },
  website: {
    type: DataTypes.STRING
  },
  types: {
    type: DataTypes.TEXT,  // Stored as JSON string
    get() {
      const value = this.getDataValue('types');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('types', JSON.stringify(value));
    }
  },
  specialties: {
    type: DataTypes.TEXT,  // Stored as JSON string
    get() {
      const value = this.getDataValue('specialties');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('specialties', JSON.stringify(value));
    }
  },
  insuranceAccepted: {
    type: DataTypes.TEXT,  // Stored as JSON string
    get() {
      const value = this.getDataValue('insuranceAccepted');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('insuranceAccepted', JSON.stringify(value));
    }
  },
  rating: {
    type: DataTypes.FLOAT,
    validate: {
      min: 0,
      max: 5
    }
  },
  priceLevel: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 4
    }
  },
  placeId: {
    type: DataTypes.STRING,
    unique: true
  }
}, {
  timestamps: true
});

export default Provider;

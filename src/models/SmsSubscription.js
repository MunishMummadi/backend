import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SmsSubscription = sequelize.define('SmsSubscription', {
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  providerTypes: {
    type: DataTypes.TEXT,  // Stored as JSON string
    get() {
      const value = this.getDataValue('providerTypes');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('providerTypes', JSON.stringify(value));
    }
  },
  latitude: {
    type: DataTypes.FLOAT
  },
  longitude: {
    type: DataTypes.FLOAT
  },
  radius: {
    type: DataTypes.FLOAT,
    defaultValue: 10 // in kilometers
  },
  anonymousId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastNotificationSent: {
    type: DataTypes.DATE
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['phoneNumber'] },
    { fields: ['anonymousId'] }
  ]
});

export default SmsSubscription;

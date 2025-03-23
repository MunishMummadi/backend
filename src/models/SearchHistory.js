import mongoose from 'mongoose';

const SearchHistorySchema = new mongoose.Schema({
  anonymousId: {
    type: String,
    required: true
  },
  searchParams: {
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    type: {
      type: String
    },
    specialty: {
      type: String
    },
    priceRange: {
      type: Number
    },
    radius: {
      type: Number
    },
    insuranceProvider: {
      type: String
    }
  },
  resultCount: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create index for user lookups
SearchHistorySchema.index({ anonymousId: 1 });
// Create index for timestamp to sort by recency
SearchHistorySchema.index({ timestamp: -1 });

const SearchHistory = mongoose.model('SearchHistory', SearchHistorySchema);

export default SearchHistory;

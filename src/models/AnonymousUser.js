import mongoose from 'mongoose';

const AnonymousUserSchema = new mongoose.Schema({
  anonymousId: {
    type: String,
    required: true,
    unique: true
  },
  savedProviders: [{
    providerId: {
      type: String,
      required: true
    },
    savedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastAccess: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create index for faster lookups
AnonymousUserSchema.index({ anonymousId: 1 });

const AnonymousUser = mongoose.model('AnonymousUser', AnonymousUserSchema);

export default AnonymousUser;

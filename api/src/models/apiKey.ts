import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
    apiKey: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
})

export const ApiKey = mongoose.model('ApiKey', apiKeySchema);
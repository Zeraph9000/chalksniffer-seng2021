import crypto from 'crypto';
import mongoose from 'mongoose';
import StoreModel from '../models/store';
import type { ErrorObject, store } from '../types';
import { validateStore } from '../utils/validation';

export async function createStore(
  userId: string,
  body: Partial<store>
): Promise<store | ErrorObject> {
  let ret;
  //Check for invalid body here
  const storeBodyCheck = validateStore(body);
  if (!storeBodyCheck.res) {
    ret = {
      error: 'BAD REQUEST',
      message: 'Invalid request body / missing required fields'
    } as ErrorObject
  }

  const store = await StoreModel.findOne({ userId });
  if (store != null) {
    ret = {
      error: 'CONFLICT',
      message: 'Store already exists for this seller'
    } as ErrorObject
  }

  if (!ret) {
    const storeId = crypto.randomUUID();

    const newStore: store = {
        storeId,
        userId,
        storeName: body.storeName!,
        description: body.description!,
        status: body.status!,
        logoUrl: body.logoUrl,
        bannerUrl: body.bannerUrl,
        location: body.location,
        category: body.category,
        createdAt: body.createdAt!,
        updatedAt: body.updatedAt!
    }

    await StoreModel.create(newStore);
    
    ret = newStore as store;
  }

  return ret;
}

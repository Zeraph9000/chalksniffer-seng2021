import crypto from 'crypto';
import StoreModel from '../models/store';
import type { ErrorObject, store, UpdateStoreRequest } from '../types';
import { validateStore } from '../utils/validation';

export async function createStore(
  userId: string,
  body: Partial<store>
): Promise<store | ErrorObject> {
  let ret;
  // Check for invalid body here
  const storeBodyCheck = validateStore(body);
  if (!storeBodyCheck.res) {
    ret = {
      error: 'INVALID_STORE_BODY',
      message: 'Invalid request body / missing required fields',
    } as ErrorObject;
  }

  const store = await StoreModel.findOne({ userId });
  if (store != null) {
    ret = {
      error: 'CONFLICT',
      message: 'Store already exists for this seller',
    } as ErrorObject;
  }

  if (!ret) {
    const storeId = crypto.randomUUID();

    const now: Date = new Date();

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
      createdAt: now,
      updatedAt: now,
    };

    await StoreModel.create(newStore);

    ret = newStore as store;
  }

  return ret;
}

export async function editStore(
  store: store,
  body: UpdateStoreRequest
): Promise<store | ErrorObject> {
  let ret;
  const editedStore = store;
  const now: Date = new Date();

  if (body.storeName !== undefined) {
    editedStore.storeName = body.storeName;
  }

  if (body.description !== undefined) {
    editedStore.description = body.description;
  }

  if (body.logoUrl !== undefined) {
    editedStore.logoUrl = body.logoUrl;
  }

  if (body.bannerUrl !== undefined) {
    editedStore.bannerUrl = body.bannerUrl;
  }

  if (body.location !== undefined) {
    editedStore.location = body.location;
  }

  if (body.category !== undefined) {
    editedStore.category = body.category;
  }

  if (body.status !== undefined) {
    editedStore.status = body.status;
  }

  editedStore.updatedAt = now;

  const storeBodyCheck = validateStore(editedStore);
  if (!storeBodyCheck.res) {
    ret = {
      error: 'INVALID_STORE_BODY',
      message: 'Invalid request body',
    } as ErrorObject;
  }

  if (!ret) {
    ret = editedStore;
  }

  return ret;
}

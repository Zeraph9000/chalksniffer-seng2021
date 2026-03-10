import mongoose from 'mongoose';

const orderXmlSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  xml: { type: String, required: true },
});

const OrderXml = mongoose.model('OrderXml', orderXmlSchema);

export default OrderXml;

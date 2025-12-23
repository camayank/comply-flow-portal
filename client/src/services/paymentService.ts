import apiClient from './api';

export interface CreatePaymentOrderData {
  amount: number;
  serviceInstanceId?: string;
  invoiceId?: string;
  purpose: string;
  metadata?: Record<string, any>;
}

export const paymentService = {
  // Create payment order
  createOrder: async (data: CreatePaymentOrderData) => {
    const response = await apiClient.post('/payments/create-order', data);
    return response.data;
  },

  // Verify payment
  verifyPayment: async (paymentId: string, signature: string, orderId: string) => {
    const response = await apiClient.post('/payments/verify', {
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      razorpay_order_id: orderId,
    });
    return response.data;
  },

  // Get payment history
  getPaymentHistory: async (filters?: any) => {
    const response = await apiClient.get('/payments/history', { params: filters });
    return response.data;
  },

  // Request refund
  requestRefund: async (paymentId: string, reason?: string) => {
    const response = await apiClient.post('/payments/refund', { paymentId, reason });
    return response.data;
  },

  // Get payment methods
  getPaymentMethods: async () => {
    const response = await apiClient.get('/payments/methods');
    return response.data;
  },

  // Add payment method
  addPaymentMethod: async (data: any) => {
    const response = await apiClient.post('/payments/methods', data);
    return response.data;
  },

  // Delete payment method
  deletePaymentMethod: async (id: string) => {
    const response = await apiClient.delete(`/payments/methods/${id}`);
    return response.data;
  },
};

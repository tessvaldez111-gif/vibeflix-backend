// ===== Payment & Points Service =====
import apiClient from './api';
import type { PointsInfo, PointsLogItem, RechargePackage, PaginatedResponse, Order } from '../types';

export const paymentService = {
  /** Get user points balance */
  getMyPoints: async (): Promise<PointsInfo> => {
    const res = await apiClient.get<{ data: PointsInfo }>('/api/points/my');
    return res.data.data;
  },

  /** Get points transaction log */
  getMyLog: async (page = 1, pageSize = 10): Promise<PaginatedResponse<PointsLogItem>> => {
    const res = await apiClient.get<{ data: PaginatedResponse<PointsLogItem> }>(`/api/points/my/log?page=${page}&pageSize=${pageSize}`);
    return res.data.data;
  },

  /** Daily sign-in for bonus points */
  signin: async (): Promise<{ balance: number; points: number }> => {
    const res = await apiClient.post<{ data: { balance: number; points: number } }>('/api/points/signin');
    return res.data.data;
  },

  /** Get available recharge packages */
  getPackages: async (): Promise<RechargePackage[]> => {
    const res = await apiClient.get<{ data: RechargePackage[] }>('/api/recharge/packages');
    return res.data.data;
  },

  /** Create a recharge order */
  createRechargeOrder: async (packageId: number): Promise<{ order_no: string; id: number }> => {
    const res = await apiClient.post<{ data: { order_no: string; id: number } }>('/api/recharge/create-order', { packageId });
    return res.data.data;
  },

  /** Purchase an episode with points */
  purchaseEpisode: async (dramaId: number, episodeId: number, pointsCost: number): Promise<{ balance: number }> => {
    const res = await apiClient.post<{ data: { balance: number } }>('/api/points/purchase', { dramaId, episodeId, pointsCost });
    return res.data.data;
  },

  /** Get my orders */
  getMyOrders: async (page = 1, pageSize = 10): Promise<PaginatedResponse<Order>> => {
    const res = await apiClient.get<{ data: PaginatedResponse<Order> }>(`/api/orders/my?page=${page}&pageSize=${pageSize}`);
    return res.data.data;
  },

  /** Create PayPal payment */
  createPaypalPayment: async (orderNo: string): Promise<{ orderId: string; approveUrl: string }> => {
    const res = await apiClient.post<{ data: { orderId: string; approveUrl: string } }>('/api/payment/paypal/create', { orderNo });
    return res.data.data;
  },

  /** Capture PayPal payment */
  capturePaypalPayment: async (paypalOrderId: string): Promise<{ orderNo: string }> => {
    const res = await apiClient.post<{ data: { orderNo: string } }>('/api/payment/paypal/capture', { paypalOrderId });
    return res.data.data;
  },
};

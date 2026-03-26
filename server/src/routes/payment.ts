import { Router, Request, Response } from 'express';
import { optionalAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import * as OrderModel from '../models/Order';
import * as SettingsModel from '../models/Settings';
import * as UserPoints from '../models/UserPoints';

const router = Router();

// ========== PayPal 支付 API（用户端） ==========

// 创建 PayPal 支付
router.post('/payment/paypal/create', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const { orderNo } = req.body;
    if (!orderNo) return res.status(400).json({ success: false, message: '缺少订单号' });

    const order = await OrderModel.getOrderByNo(orderNo);
    if (!order || order.user_id !== req.user.id) return res.status(404).json({ success: false, message: '订单不存在' });
    if (order.status !== 'pending') return res.status(400).json({ success: false, message: '订单状态异常' });

    // 检查是否过期
    if (order.expires_at && new Date(order.expires_at) < new Date()) {
      await OrderModel.updateOrderStatus(order.id, 'cancelled');
      return res.status(400).json({ success: false, message: '订单已过期' });
    }

    const paypalConfig = await SettingsModel.getPaypalConfig();
    if (!paypalConfig.enabled) return res.status(400).json({ success: false, message: 'PayPal 支付未启用' });

    // 创建 PayPal 订单
    const { default: fetch } = await import('node-fetch');
    const baseUrl = paypalConfig.mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const auth = Buffer.from(`${paypalConfig.clientId}:${paypalConfig.clientSecret}`).toString('base64');

    const paypalRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: order.order_no,
          amount: {
            currency_code: order.currency,
            value: order.total_amount.toFixed(2),
          },
          description: `充值 ${order.points_amount} 积分`,
        }],
        application_context: {
          brand_name: '短剧平台',
          user_action: 'PAY_NOW',
          return_url: `${req.protocol}://${req.get('host')}/payment/success`,
          cancel_url: `${req.protocol}://${req.get('host')}/payment/cancel`,
        },
      }),
    });

    const paypalData = await paypalRes.json() as any;
    if (!paypalRes.ok) {
      console.error('PayPal create order error:', paypalData);
      return res.status(500).json({ success: false, message: '创建支付订单失败' });
    }

    // 保存 PayPal order ID
    await OrderModel.createPayment({
      orderId: order.id,
      paymentNo: paypalData.id,
      paymentMethod: 'paypal',
      status: 'pending',
      amount: order.total_amount,
      currency: order.currency,
      paypalOrderId: paypalData.id,
    });

    const approveLink = paypalData.links?.find((l: any) => l.rel === 'approve');
    res.json({
      success: true,
      data: {
        orderId: paypalData.id,
        approveUrl: approveLink?.href || '',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '创建支付失败' });
  }
});

// PayPal 支付回调 - 捕获支付
router.post('/payment/paypal/capture', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const { paypalOrderId } = req.body;
    if (!paypalOrderId) return res.status(400).json({ success: false, message: '缺少 PayPal 订单号' });

    const paypalConfig = await SettingsModel.getPaypalConfig();
    const { default: fetch } = await import('node-fetch');
    const baseUrl = paypalConfig.mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const auth = Buffer.from(`${paypalConfig.clientId}:${paypalConfig.clientSecret}`).toString('base64');

    // 捕获支付
    const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
    });

    const captureData = await captureRes.json() as any;
    if (!captureRes.ok || captureData.status !== 'COMPLETED') {
      console.error('PayPal capture error:', captureData);
      return res.status(400).json({ success: false, message: '支付捕获失败' });
    }

    // 查找对应的支付记录
    const db = await import('../db');
    const [paymentRow] = await db.query(
      'SELECT * FROM payments WHERE paypal_order_id = ? AND status = ?',
      [paypalOrderId, 'pending']
    ) as any[];

    if (!paymentRow) {
      return res.status(404).json({ success: false, message: '支付记录未找到' });
    }

    const order = await OrderModel.getOrderById(paymentRow.order_id);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });

    // 更新支付记录
    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || '';
    const payerInfo = captureData.payer || {};
    await OrderModel.updatePayment(paymentRow.id, {
      status: 'completed',
      paypal_capture_id: captureId,
      payer_email: payerInfo.email_address || '',
      payer_id: payerInfo.payer_id || '',
    });

    // 更新订单状态
    await OrderModel.updateOrderStatus(order.id, 'paid', captureId);

    // 充值订单：给用户加积分
    if (order.type === 'recharge' && order.status === 'paid') {
      await UserPoints.addPoints(
        order.user_id,
        order.points_amount,
        'recharge',
        order.order_no,
        `充值 ${order.points_amount} 积分（订单 ${order.order_no}）`
      );
    }

    res.json({ success: true, message: '支付成功', data: { orderNo: order.order_no } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '支付处理失败' });
  }
});

export default router;

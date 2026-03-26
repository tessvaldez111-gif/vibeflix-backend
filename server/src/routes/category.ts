import { Router, Response } from 'express';
import * as CategoryModel from '../models/Category';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// 获取所有分类
router.get('/', async (_req, res: Response) => {
  try {
    const categories = await CategoryModel.findAllCategories();
    res.json({ success: true, data: categories });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取分类失败' });
  }
});

// 获取分类及短剧数量（管理后台用）
router.get('/with-count', requireAdmin, async (_req, res: Response) => {
  try {
    const categories = await CategoryModel.findAllCategoriesWithCount();
    res.json({ success: true, data: categories });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取分类失败' });
  }
});

// 创建分类（管理后台）
router.post('/', requireAdmin, async (req, res: Response) => {
  try {
    const { name, icon, sort_order } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: '分类名称不能为空' });
      return;
    }
    const id = await CategoryModel.createCategory({ name, icon, sort_order });
    res.json({ success: true, data: { id } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '创建分类失败' });
  }
});

// 更新分类（管理后台）
router.put('/:id', requireAdmin, async (req, res: Response) => {
  try {
    await CategoryModel.updateCategory(Number(req.params.id), req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '更新分类失败' });
  }
});

// 删除分类（管理后台）
router.delete('/:id', requireAdmin, async (req, res: Response) => {
  try {
    await CategoryModel.deleteCategory(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '删除分类失败' });
  }
});

export default router;

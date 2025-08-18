import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import AddSubscription from '../AddSubscription';
import { subscriptionAPI, llmAPI } from '../../services/api';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

jest.mock('../../services/api', () => ({
  subscriptionAPI: {
    create: jest.fn(),
  },
  llmAPI: {
    parseSubscription: jest.fn(),
  },
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

const renderAddSubscription = () => {
  return render(
    <BrowserRouter>
      <AddSubscription />
    </BrowserRouter>
  );
};

describe('AddSubscription Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('页面渲染', () => {
    test('正确渲染页面标题和主要元素', () => {
      renderAddSubscription();
      
      expect(screen.getByText('添加新订阅')).toBeInTheDocument();
      expect(screen.getByText('AI 快速添加')).toBeInTheDocument();
      expect(screen.getByText('基本信息')).toBeInTheDocument();
      expect(screen.getByText('付款信息')).toBeInTheDocument();
      expect(screen.getByText('日期信息')).toBeInTheDocument();
    });

    test('显示所有必要的表单字段', () => {
      renderAddSubscription();
      
      expect(screen.getByLabelText(/订阅名称/)).toBeInTheDocument();
      expect(screen.getByLabelText(/提供商/)).toBeInTheDocument();
      expect(screen.getByLabelText(/金额/)).toBeInTheDocument();
      expect(screen.getByLabelText(/计费周期/)).toBeInTheDocument();
      expect(screen.getByLabelText(/开始日期/)).toBeInTheDocument();
      expect(screen.getByLabelText(/下次付款日期/)).toBeInTheDocument();
    });

    test('AI解析区域布局正确', () => {
      renderAddSubscription();
      
      const aiTextarea = screen.getByPlaceholderText(/我每月支付Netflix会员89元/);
      const parseButton = screen.getByText('开始解析');
      
      expect(aiTextarea).toBeInTheDocument();
      expect(parseButton).toBeInTheDocument();
      expect(parseButton).toBeDisabled(); // 空输入时应该禁用
      
      // 检查快速示例按钮
      expect(screen.getByText('快速填充:')).toBeInTheDocument();
      expect(screen.getByText('Netflix会员每月89元')).toBeInTheDocument();
      expect(screen.getByText('Adobe年费订阅888元')).toBeInTheDocument();
    });
  });

  describe('AI解析功能', () => {
    test('AI解析按钮在有输入时启用', () => {
      renderAddSubscription();
      
      const aiTextarea = screen.getByPlaceholderText(/我每月支付Netflix会员89元/);
      const parseButton = screen.getByText('开始解析');
      
      expect(parseButton).toBeDisabled();
      
      fireEvent.change(aiTextarea, { target: { value: '我每月支付Netflix会员89元' } });
      
      expect(parseButton).not.toBeDisabled();
    });

    test('成功解析AI输入并填充表单', async () => {
      const mockParsedData = {
        name: 'Netflix',
        provider: 'Netflix Inc.',
        amount: 89,
        currency: 'CNY',
        billing_cycle: 'monthly',
        start_date: '2025-08-18',
        next_payment_date: '2025-09-18',
        category: '娱乐',
        cycle_count: 1,
        reminder_days: 7,
      };

      llmAPI.parseSubscription.mockResolvedValue({ data: mockParsedData });

      renderAddSubscription();
      
      const aiTextarea = screen.getByPlaceholderText(/我每月支付Netflix会员89元/);
      const parseButton = screen.getByText('开始解析');
      
      fireEvent.change(aiTextarea, { target: { value: '我每月支付Netflix会员89元' } });
      fireEvent.click(parseButton);
      
      await waitFor(() => {
        expect(llmAPI.parseSubscription).toHaveBeenCalledWith('我每月支付Netflix会员89元');
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('AI成功解析您的订阅信息');
      });

      // 验证表单字段被正确填充
      expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Netflix Inc.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('89')).toBeInTheDocument();
    });

    test('AI解析失败时显示错误信息', async () => {
      llmAPI.parseSubscription.mockRejectedValue(new Error('解析失败'));

      renderAddSubscription();
      
      const aiTextarea = screen.getByPlaceholderText(/我每月支付Netflix会员89元/);
      const parseButton = screen.getByText('开始解析');
      
      fireEvent.change(aiTextarea, { target: { value: '无效输入' } });
      fireEvent.click(parseButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('AI解析失败，请手动填写表单');
      });
    });

    test('AI解析过程中显示加载状态', async () => {
      llmAPI.parseSubscription.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderAddSubscription();
      
      const aiTextarea = screen.getByPlaceholderText(/我每月支付Netflix会员89元/);
      const parseButton = screen.getByText('开始解析');
      
      fireEvent.change(aiTextarea, { target: { value: '测试输入' } });
      fireEvent.click(parseButton);
      
      expect(screen.getByText('AI解析中...')).toBeInTheDocument();
      expect(parseButton).toBeDisabled();
    });

    test('快速示例按钮填充文本框', () => {
      renderAddSubscription();
      
      const aiTextarea = screen.getByPlaceholderText(/我每月支付Netflix会员89元/);
      const exampleButton = screen.getByText('Netflix会员每月89元');
      
      fireEvent.click(exampleButton);
      
      expect(aiTextarea).toHaveValue('Netflix会员每月89元');
      
      // 检查按钮变为启用状态
      const parseButton = screen.getByText('开始解析');
      expect(parseButton).not.toBeDisabled();
    });
  });

  describe('表单验证', () => {
    test('提交空表单时显示验证错误', async () => {
      renderAddSubscription();
      
      const submitButton = screen.getByText('保存订阅');
      fireEvent.click(submitButton);
      
      // HTML5 验证会阻止提交，不会调用API
      expect(subscriptionAPI.create).not.toHaveBeenCalled();
    });

    test('输入无效金额时显示错误', async () => {
      renderAddSubscription();
      
      fireEvent.change(screen.getByLabelText(/订阅名称/), { target: { value: 'Test Service' } });
      fireEvent.change(screen.getByLabelText(/金额/), { target: { value: '0' } });
      
      const submitButton = screen.getByText('保存订阅');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('请输入有效的金额');
      });
    });
  });

  describe('表单提交', () => {
    test('成功提交表单', async () => {
      subscriptionAPI.create.mockResolvedValue({});

      renderAddSubscription();
      
      // 填写必要字段
      fireEvent.change(screen.getByLabelText(/订阅名称/), { target: { value: 'Test Service' } });
      fireEvent.change(screen.getByLabelText(/金额/), { target: { value: '99.99' } });
      
      const submitButton = screen.getByText('保存订阅');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(subscriptionAPI.create).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('订阅添加成功');
      });
    });

    test('提交失败时显示错误信息', async () => {
      subscriptionAPI.create.mockRejectedValue(new Error('提交失败'));

      renderAddSubscription();
      
      fireEvent.change(screen.getByLabelText(/订阅名称/), { target: { value: 'Test Service' } });
      fireEvent.change(screen.getByLabelText(/金额/), { target: { value: '99.99' } });
      
      const submitButton = screen.getByText('保存订阅');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('添加失败，请检查表单并重试');
      });
    });
  });

  describe('响应式设计', () => {
    test('在不同屏幕尺寸下正确渲染', () => {
      renderAddSubscription();
      
      // 检查响应式类名是否存在
      const container = screen.getByText('添加新订阅').closest('.max-w-5xl');
      expect(container).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
      
      // 检查表单网格布局
      const formGrids = container.querySelectorAll('.grid.grid-cols-1.lg\\:grid-cols-2');
      expect(formGrids.length).toBeGreaterThan(0);
    });

    test('AI解析区域响应式布局正确', () => {
      renderAddSubscription();
      
      const aiContainer = screen.getByText('AI 快速添加').closest('div');
      expect(aiContainer).toHaveClass('rounded-xl', 'shadow-lg', 'p-6', 'sm:p-8');
    });
  });

  describe('下次付款日期计算', () => {
    test('修改开始日期时自动计算下次付款日期', () => {
      renderAddSubscription();
      
      const startDateInput = screen.getByLabelText(/开始日期/);
      const nextPaymentInput = screen.getByLabelText(/下次付款日期/);
      
      fireEvent.change(startDateInput, { target: { value: '2025-08-01' } });
      
      // 默认是月付，应该计算为下个月同一天
      expect(nextPaymentInput).toHaveValue('2025-09-01');
    });

    test('修改计费周期时重新计算下次付款日期', () => {
      renderAddSubscription();
      
      const startDateInput = screen.getByLabelText(/开始日期/);
      const billingCycleSelect = screen.getByLabelText(/计费周期/);
      const nextPaymentInput = screen.getByLabelText(/下次付款日期/);
      
      fireEvent.change(startDateInput, { target: { value: '2025-08-01' } });
      fireEvent.change(billingCycleSelect, { target: { value: 'yearly' } });
      
      // 年付应该计算为明年同一天
      expect(nextPaymentInput).toHaveValue('2026-08-01');
    });
  });
});
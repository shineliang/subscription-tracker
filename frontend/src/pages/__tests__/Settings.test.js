import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import Settings from '../Settings';

// Mock dependencies
jest.mock('react-toastify');
jest.mock('../../services/api', () => ({
  notificationAPI: {
    getSettings: jest.fn(),
    updateSettings: jest.fn()
  }
}));

// Mock axios at the module level
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  }
}));

// Import the mocked API
const { notificationAPI: mockNotificationAPI } = require('../../services/api');

const renderSettings = () => {
  return render(
    <BrowserRouter>
      <Settings />
    </BrowserRouter>
  );
};

describe('Settings Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    global.localStorage = localStorageMock;
    
    // Mock sessionStorage
    const sessionStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    global.sessionStorage = sessionStorageMock;
    
    // Mock window.dispatchEvent
    global.window.dispatchEvent = jest.fn();
  });

  test('应该在保存邮箱设置后更新本地用户信息', async () => {
    // Mock API responses
    mockNotificationAPI.getSettings.mockResolvedValue({
      data: {
        email: 'old@example.com',
        notify_days_before: 7,
        email_notifications: true,
        browser_notifications: true
      }
    });
    
    mockNotificationAPI.updateSettings.mockResolvedValue({});

    // Mock localStorage to return existing user
    const existingUser = {
      id: 1,
      username: 'testuser',
      email: 'old@example.com'
    };
    
    localStorage.getItem.mockReturnValue(JSON.stringify(existingUser));
    
    renderSettings();

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('old@example.com')).toBeInTheDocument();
    });

    // Change email
    const emailInput = screen.getByDisplayValue('old@example.com');
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

    // Save settings
    const saveButton = screen.getByText('保存设置');
    fireEvent.click(saveButton);

    await waitFor(() => {
      // Verify API was called
      expect(mockNotificationAPI.updateSettings).toHaveBeenCalledWith({
        email: 'new@example.com',
        notify_days_before: 7,
        email_notifications: 1,
        browser_notifications: 1
      });

      // Verify localStorage was updated with new email
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify({
          ...existingUser,
          email: 'new@example.com'
        })
      );

      // Verify custom event was dispatched
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'userUpdated'
        })
      );

      // Verify success toast
      expect(toast.success).toHaveBeenCalledWith('设置已保存');
    });
  });

  test('应该在邮箱为空且启用邮件通知时显示警告', async () => {
    // Mock API responses
    mockNotificationAPI.getSettings.mockResolvedValue({
      data: {
        email: '',
        notify_days_before: 7,
        email_notifications: false,
        browser_notifications: true
      }
    });

    renderSettings();

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /启用邮件通知/ })).toBeInTheDocument();
    });

    // Enable email notifications without setting email
    const emailNotificationCheckbox = screen.getByRole('checkbox', { name: /启用邮件通知/ });
    fireEvent.click(emailNotificationCheckbox);

    // Try to save
    const saveButton = screen.getByText('保存设置');
    fireEvent.click(saveButton);

    await waitFor(() => {
      // Verify warning toast
      expect(toast.warning).toHaveBeenCalledWith('请输入邮箱地址以启用邮件通知');
      
      // Verify API was not called
      expect(mockNotificationAPI.updateSettings).not.toHaveBeenCalled();
    });
  });

  test('应该同时更新localStorage和sessionStorage', async () => {
    // Mock API responses
    mockNotificationAPI.getSettings.mockResolvedValue({
      data: {
        email: 'test@example.com',
        notify_days_before: 5,
        email_notifications: true,
        browser_notifications: false
      }
    });
    
    mockNotificationAPI.updateSettings.mockResolvedValue({});

    // Mock both localStorage and sessionStorage to return user data
    const existingUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    };
    
    localStorage.getItem.mockReturnValue(JSON.stringify(existingUser));
    sessionStorage.getItem.mockReturnValue(JSON.stringify(existingUser));
    
    renderSettings();

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    // Change email
    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'updated@example.com' } });

    // Save settings
    const saveButton = screen.getByText('保存设置');
    fireEvent.click(saveButton);

    await waitFor(() => {
      const updatedUser = {
        ...existingUser,
        email: 'updated@example.com'
      };

      // Verify both localStorage and sessionStorage were updated
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(updatedUser)
      );
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(updatedUser)
      );
    });
  });

  test('应该处理本地存储更新错误', async () => {
    // Mock API responses
    mockNotificationAPI.getSettings.mockResolvedValue({
      data: {
        email: 'test@example.com',
        notify_days_before: 7,
        email_notifications: true,
        browser_notifications: true
      }
    });
    
    mockNotificationAPI.updateSettings.mockResolvedValue({});

    // Mock localStorage to return invalid JSON
    localStorage.getItem.mockReturnValue('invalid-json');
    
    // Mock console.error to avoid noise in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    renderSettings();

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    // Save settings
    const saveButton = screen.getByText('保存设置');
    fireEvent.click(saveButton);

    await waitFor(() => {
      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith('更新本地用户信息失败:', expect.any(Error));
      
      // Verify success toast still shown (API call succeeded)
      expect(toast.success).toHaveBeenCalledWith('设置已保存');
    });
    
    consoleSpy.mockRestore();
  });
});
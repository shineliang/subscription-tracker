import axios from 'axios';
import { dataAPI } from '../api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock the api instance
const mockApiInstance = {
  get: jest.fn(),
  post: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

// Mock axios.create to return our mock instance
mockedAxios.create = jest.fn(() => mockApiInstance);

describe('数据导入导出API测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportData', () => {
    test('应该成功调用导出数据API', async () => {
      const mockResponseData = 'id,name,provider,amount\n1,Netflix,Netflix Inc,15.99';
      const mockResponse = {
        data: mockResponseData,
        status: 200,
        headers: {
          'content-type': 'text/csv',
          'content-disposition': 'attachment; filename=subscriptions.csv'
        }
      };

      mockApiInstance.get.mockResolvedValue(mockResponse);

      const result = await dataAPI.exportData();

      expect(mockApiInstance.get).toHaveBeenCalledWith('/export-data', {
        responseType: 'blob'
      });
      expect(result).toEqual(mockResponse);
    });

    test('应该在API调用失败时抛出错误', async () => {
      const errorMessage = '导出数据失败';
      mockApiInstance.get.mockRejectedValue(new Error(errorMessage));

      await expect(dataAPI.exportData()).rejects.toThrow(errorMessage);
      
      expect(mockApiInstance.get).toHaveBeenCalledWith('/export-data', {
        responseType: 'blob'
      });
    });

    test('应该使用正确的响应类型', async () => {
      const mockResponse = { data: 'csv data' };
      mockApiInstance.get.mockResolvedValue(mockResponse);

      await dataAPI.exportData();

      expect(mockApiInstance.get).toHaveBeenCalledWith('/export-data', {
        responseType: 'blob'
      });
    });
  });

  describe('importData', () => {
    test('应该成功调用导入数据API', async () => {
      const mockFile = new File(['test csv content'], 'test.csv', {
        type: 'text/csv'
      });
      const mockResponse = {
        data: { success: 5, error: 0 },
        status: 200
      };

      mockApiInstance.post.mockResolvedValue(mockResponse);

      const result = await dataAPI.importData(mockFile);

      expect(mockApiInstance.post).toHaveBeenCalledWith(
        '/import-data',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      expect(result).toEqual(mockResponse);

      // 验证FormData包含正确的文件
      const callArgs = mockApiInstance.post.mock.calls[0];
      const formData = callArgs[1];
      expect(formData).toBeInstanceOf(FormData);
      expect(formData.get('file')).toBe(mockFile);
    });

    test('应该在API调用失败时抛出错误', async () => {
      const mockFile = new File(['test csv content'], 'test.csv', {
        type: 'text/csv'
      });
      const errorMessage = '导入数据失败';
      
      mockApiInstance.post.mockRejectedValue(new Error(errorMessage));

      await expect(dataAPI.importData(mockFile)).rejects.toThrow(errorMessage);
    });

    test('应该使用正确的Content-Type头', async () => {
      const mockFile = new File(['test csv content'], 'test.csv', {
        type: 'text/csv'
      });
      const mockResponse = { data: { success: 1, error: 0 } };
      
      mockApiInstance.post.mockResolvedValue(mockResponse);

      await dataAPI.importData(mockFile);

      expect(mockApiInstance.post).toHaveBeenCalledWith(
        '/import-data',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
    });
  });
});
import React, { useEffect, useState } from 'react';
import { subscriptionAPI } from '../services/api';

const TokenDebug = () => {
  const [tokenInfo, setTokenInfo] = useState({});
  const [apiTestResult, setApiTestResult] = useState('');

  useEffect(() => {
    // 获取token信息
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    const isAuthenticated = localStorage.getItem('isAuthenticated');

    let tokenData = null;
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          tokenData = JSON.parse(atob(parts[1]));
          tokenData.expDate = new Date(tokenData.exp * 1000);
          tokenData.isExpired = tokenData.expDate < new Date();
        }
      } catch (e) {
        console.error('解析token失败:', e);
      }
    }

    setTokenInfo({
      hasToken: !!token,
      token: token ? `${token.substring(0, 50)}...` : null,
      tokenData,
      user: user ? JSON.parse(user) : null,
      isAuthenticated,
      storage: token ? (localStorage.getItem('token') ? 'localStorage' : 'sessionStorage') : 'none'
    });
  }, []);

  const testAPI = async () => {
    try {
      setApiTestResult('测试中...');
      const response = await subscriptionAPI.getAll();
      setApiTestResult(`成功！获取到 ${response.data.length} 个订阅`);
    } catch (error) {
      setApiTestResult(`失败: ${error.response?.data?.error || error.message}`);
    }
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.reload();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Token调试信息</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">认证状态</h2>
        <div className="space-y-2">
          <p><strong>Has Token:</strong> {tokenInfo.hasToken ? '是' : '否'}</p>
          <p><strong>Is Authenticated:</strong> {tokenInfo.isAuthenticated || '未设置'}</p>
          <p><strong>Storage Type:</strong> {tokenInfo.storage}</p>
          {tokenInfo.token && (
            <p><strong>Token:</strong> <code className="text-xs">{tokenInfo.token}</code></p>
          )}
        </div>
      </div>

      {tokenInfo.tokenData && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Token内容</h2>
          <div className="space-y-2">
            <p><strong>用户ID:</strong> {tokenInfo.tokenData.id}</p>
            <p><strong>用户名:</strong> {tokenInfo.tokenData.username}</p>
            <p><strong>邮箱:</strong> {tokenInfo.tokenData.email}</p>
            <p><strong>过期时间:</strong> {tokenInfo.tokenData.expDate?.toLocaleString()}</p>
            <p><strong>是否过期:</strong> {tokenInfo.tokenData.isExpired ? '是' : '否'}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">API测试</h2>
        <button 
          onClick={testAPI}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
        >
          测试API调用
        </button>
        {apiTestResult && (
          <p className={apiTestResult.includes('成功') ? 'text-green-600' : 'text-red-600'}>
            {apiTestResult}
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">操作</h2>
        <button 
          onClick={clearAuth}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          清除认证信息
        </button>
      </div>
    </div>
  );
};

export default TokenDebug;
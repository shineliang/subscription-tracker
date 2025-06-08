import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 布局组件
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';

// 页面组件
import Dashboard from './pages/Dashboard';
import SubscriptionList from './pages/SubscriptionList';
import AddSubscription from './pages/AddSubscription';
import EditSubscription from './pages/EditSubscription';
import SubscriptionDetail from './pages/SubscriptionDetail';
import PaymentHistory from './pages/PaymentHistory';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import BudgetManagement from './pages/BudgetManagement';
import NotFound from './pages/NotFound';

// 受保护的路由组件
const ProtectedRoute = ({ children }) => {
  let isAuthenticated = false;
  
  try {
    isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  } catch (error) {
    console.error('无法访问localStorage:', error);
    // 在隐私模式或localStorage不可用时的降级处理
    isAuthenticated = false;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const [darkMode, setDarkMode] = useState(false);
  
  // 检测系统主题偏好
  useEffect(() => {
    const isDarkPreferred = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDarkPreferred);
    
    // 监听主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return (
    <div className={darkMode ? 'dark' : ''}>
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={darkMode ? 'dark' : 'light'}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout darkMode={darkMode} setDarkMode={setDarkMode} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="subscriptions" element={<SubscriptionList />} />
          <Route path="subscriptions/add" element={<AddSubscription />} />
          <Route path="subscriptions/edit/:id" element={<EditSubscription />} />
          <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
          <Route path="payments" element={<PaymentHistory />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="budgets" element={<BudgetManagement />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;

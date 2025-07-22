import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { pageTransition } from './utils/animations';

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
import ChangePassword from './pages/ChangePassword';
import BudgetManagement from './pages/BudgetManagement';
import IntelligentAnalysis from './pages/IntelligentAnalysis';
import NotFound from './pages/NotFound';
import TokenDebug from './pages/TokenDebug';

// 受保护的路由组件
const ProtectedRoute = ({ children }) => {
  let isAuthenticated = false;
  let hasToken = false;
  
  try {
    isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    // 检查是否有token
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    hasToken = !!token;
    
    // 如果有token，检查是否过期
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expDate = new Date(payload.exp * 1000);
        const isExpired = expDate < new Date();
        
        if (isExpired) {
          // Token已过期，清除认证信息
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          hasToken = false;
          isAuthenticated = false;
        }
      } catch (e) {
        // Token解析失败，视为无效
        hasToken = false;
        isAuthenticated = false;
      }
    }
  } catch (error) {
    console.error('无法访问localStorage:', error);
    // 在隐私模式或localStorage不可用时的降级处理
    isAuthenticated = false;
    hasToken = false;
  }
  
  // 必须同时有isAuthenticated标记和有效的token才能访问
  return (isAuthenticated && hasToken) ? children : <Navigate to="/login" />;
};

// Animated page wrapper
const AnimatedPage = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
    >
      {children}
    </motion.div>
  );
};

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const location = useLocation();
  
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
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
          <Route path="/register" element={<AnimatedPage><Register /></AnimatedPage>} />
          <Route path="/token-debug" element={<AnimatedPage><TokenDebug /></AnimatedPage>} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} setDarkMode={setDarkMode} />
              </ProtectedRoute>
            }
          >
            <Route index element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="subscriptions" element={<AnimatedPage><SubscriptionList /></AnimatedPage>} />
            <Route path="subscriptions/add" element={<AnimatedPage><AddSubscription /></AnimatedPage>} />
            <Route path="subscriptions/edit/:id" element={<AnimatedPage><EditSubscription /></AnimatedPage>} />
            <Route path="subscriptions/:id" element={<AnimatedPage><SubscriptionDetail /></AnimatedPage>} />
            <Route path="payments" element={<AnimatedPage><PaymentHistory /></AnimatedPage>} />
            <Route path="statistics" element={<AnimatedPage><Statistics /></AnimatedPage>} />
            <Route path="budgets" element={<AnimatedPage><BudgetManagement /></AnimatedPage>} />
            <Route path="analysis" element={<AnimatedPage><IntelligentAnalysis /></AnimatedPage>} />
            <Route path="settings" element={<AnimatedPage><Settings /></AnimatedPage>} />
            <Route path="change-password" element={<AnimatedPage><ChangePassword /></AnimatedPage>} />
            <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
          </Route>
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;

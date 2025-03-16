/**
 * 全局错误处理中间件
 */

// 捕获并格式化错误响应
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error(err.stack);
  
  // 默认服务器错误
  let statusCode = err.statusCode || 500;
  let message = err.message || '服务器内部错误';
  
  // 处理不同类型的错误
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '数据验证失败: ' + err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = '未授权的请求';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = '禁止访问';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = '未找到资源';
  }
  
  // 发送错误响应
  res.status(statusCode).json({
    error: message,
    status: statusCode,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
};

module.exports = errorHandler;

// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Set appropriate status code
  const statusCode = err.statusCode || 500;
  
  // Send error response
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    path: req.path
  });
};

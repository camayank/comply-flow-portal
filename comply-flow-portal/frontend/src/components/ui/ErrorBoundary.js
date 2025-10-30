import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    if (process.env.NODE_ENV === 'production') {
      // Log to error tracking service (e.g., Sentry)
      console.error('Production error:', { error, errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-500" />
              <h1 className="mt-4 text-2xl font-bold text-gray-900">
                Something went wrong
              </h1>
              <p className="mt-2 text-gray-600">
                We're sorry, but something unexpected happened.
              </p>
            </div>
            
            <div className="mt-8 bg-white shadow rounded-lg p-6">
              <div className="space-y-4">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full btn btn-primary"
                >
                  Reload Page
                </button>
                
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full btn btn-secondary"
                >
                  Go to Dashboard
                </button>
              </div>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-6 text-sm text-gray-600">
                  <summary className="cursor-pointer font-medium text-gray-900">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 p-4 bg-gray-100 rounded border text-xs">
                    <div className="font-medium text-red-600 mb-2">
                      Error: {this.state.error?.toString()}
                    </div>
                    <pre className="whitespace-pre-wrap text-gray-800">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </details>
              )}
            </div>
            
            <div className="mt-6 text-center text-sm text-gray-500">
              If this problem persists, please{' '}
              <a
                href="mailto:support@complyflow.com"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                contact support
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
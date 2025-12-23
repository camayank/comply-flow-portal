# Comply Flow Portal - Frontend

Enterprise-grade compliance management platform frontend built with React, TypeScript, and Vite.

## 🏗️ Architecture

### Technology Stack

- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Zustand** - Lightweight state management
- **TanStack Query** - Server state management
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Shadcn/UI** - Re-usable component library
- **Zod** - Schema validation
- **Axios** - HTTP client

### Folder Structure

```
client/src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Card, etc.)
│   ├── leads/          # Lead management components
│   ├── proposals/      # Proposal components
│   └── hr/             # HR management components
├── pages/              # Page components (90+ pages)
├── store/              # Zustand state stores
│   ├── authStore.ts
│   ├── notificationStore.ts
│   ├── serviceStore.ts
│   ├── clientStore.ts
│   ├── leadStore.ts
│   └── dashboardStore.ts
├── services/           # API service layer
│   ├── api.ts          # Base API client
│   ├── authService.ts
│   ├── clientService.ts
│   ├── salesService.ts
│   ├── operationsService.ts
│   ├── adminService.ts
│   ├── paymentService.ts
│   └── agentService.ts
├── hooks/              # Custom React hooks
│   ├── useApi.ts
│   ├── useAuth.ts
│   ├── usePermissions.ts
│   ├── useNotifications.ts
│   ├── useForm.ts
│   └── ...
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── lib/                # Library configurations
│   ├── utils.ts
│   ├── validations.ts
│   ├── websocket.ts
│   └── queryClient.ts
├── utils/              # Utility functions
│   ├── formatters.ts
│   └── helpers.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── constants/          # Application constants
│   └── index.ts
└── config/             # Configuration files
    └── env.ts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_WS_URL=ws://localhost:5000
VITE_RAZORPAY_KEY_ID=your_key_id
```

## 📦 State Management

### Zustand Stores

- **authStore** - User authentication and session
- **notificationStore** - Real-time notifications
- **serviceStore** - Service catalog and instances
- **clientStore** - Client data and documents
- **leadStore** - Sales leads and activities
- **dashboardStore** - Dashboard statistics

### Example Usage

```typescript
import { useAuthStore } from '@/store/authStore';

function MyComponent() {
  const { user, login, logout } = useAuthStore();

  // Component logic
}
```

## 🔌 API Services

All API calls are centralized in the `services/` directory:

```typescript
import { clientService } from '@/services/clientService';

// Get dashboard data
const data = await clientService.getDashboard();

// Upload document
await clientService.uploadDocument(serviceId, formData);
```

## 🎣 Custom Hooks

### useApi Hook

```typescript
import { useApi } from '@/hooks/useApi';
import { clientService } from '@/services/clientService';

function Dashboard() {
  const { data, loading, error, execute } = useApi(
    clientService.getDashboard,
    { showSuccessToast: false }
  );

  useEffect(() => {
    execute();
  }, []);
}
```

### usePermissions Hook

```typescript
import { usePermissions, useHasRole } from '@/hooks/usePermissions';

function AdminPanel() {
  const { canManageUsers, canViewReports } = usePermissions();
  const isAdmin = useHasRole(['ADMIN', 'SUPER_ADMIN']);

  // Conditional rendering based on permissions
}
```

## 🎨 UI Components

Using Shadcn/UI component library with Tailwind CSS:

```typescript
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function MyComponent() {
  return (
    <Card>
      <Button variant="primary">Click me</Button>
    </Card>
  );
}
```

## 🔒 Authentication

Authentication is managed through AuthContext and authStore:

```typescript
import { useAuth } from '@/contexts/AuthContext';

function LoginPage() {
  const { login, isAuthenticated } = useAuth();

  const handleLogin = async () => {
    await login(email, password);
  };
}
```

## ✅ Form Validation

Using Zod schemas for type-safe validation:

```typescript
import { useForm } from '@/hooks/useForm';
import { loginSchema } from '@/lib/validations';

function LoginForm() {
  const form = useForm(
    { email: '', password: '' },
    loginSchema
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    await login(values);
  });
}
```

## 🌐 Real-time Features

WebSocket client for real-time updates:

```typescript
import { useWebSocket } from '@/lib/websocket';

function Dashboard() {
  const { connect, disconnect } = useWebSocket();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);
}
```

## 📱 Responsive Design

All components are mobile-responsive using Tailwind CSS breakpoints:

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📊 Analytics

Track user interactions and performance:

```typescript
import { trackEvent } from '@/lib/analytics';

trackEvent('button_click', { buttonName: 'Submit' });
```

## 🎯 Performance Optimization

- **Code Splitting** - Lazy loading of routes
- **Image Optimization** - Automatic image optimization
- **Caching** - API response caching with TanStack Query
- **Memoization** - Component and value memoization
- **Virtual Scrolling** - For large lists

## 🔐 Security

- **XSS Protection** - Input sanitization
- **CSRF Protection** - Token-based protection
- **Secure Storage** - Encrypted local storage
- **JWT Authentication** - Secure token management
- **Role-based Access** - Permission-based UI rendering

## 📝 Code Style

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking
- **Husky** - Pre-commit hooks

## 🚢 Deployment

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📚 Documentation

- [Component Documentation](./docs/components.md)
- [API Documentation](./docs/api.md)
- [State Management](./docs/state.md)
- [Routing](./docs/routing.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

Proprietary - All rights reserved

---

Built with ❤️ by Comply Flow Team

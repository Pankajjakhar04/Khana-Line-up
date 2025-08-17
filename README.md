# Khana Line-up - Production-Ready Food Ordering System

A modern food ordering system with queue management, Google authentication, and MongoDB Atlas integration - ready for production deployment on Vercel.

## 🚀 Features

- **Cloud Database**: MongoDB Atlas integration for scalable data storage
- **Authentication**: Email/password and Google OAuth login
- **User Management**: Customer, Vendor, and Admin roles with approval workflows
- **Menu Management**: CRUD operations for menu items with stock tracking
- **Order Management**: Real-time order processing and status updates
- **Analytics**: Sales and order analytics for vendors
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Production Ready**: Secure, scalable, and deployable to Vercel

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Firebase Auth** - Google authentication
- **Lucide React** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB Atlas** - Cloud database
- **Mongoose** - MongoDB object modeling
- **bcryptjs** - Password hashing

### Deployment
- **Vercel** - Serverless deployment platform
- **GitHub** - Version control and CI/CD

### Development Tools
- **Nodemon** - Auto-restart server during development
- **Concurrently** - Run multiple commands simultaneously
- **ESLint** - Code linting
- **PostCSS & Autoprefixer** - CSS processing

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account
- Git

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Khana-Line-up
```

### 2. Install Dependencies

```bash
npm install
```

### 3. MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com/)
   - Sign up for a free account

2. **Create a Cluster**
   - Create a new cluster (free tier is sufficient for development)
   - Choose your preferred cloud provider and region

3. **Configure Database Access**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Create a user with "Read and write to any database" permissions
   - Note down the username and password

4. **Configure Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - For development, you can add `0.0.0.0/0` (allow access from anywhere)
   - For production, add specific IP addresses

5. **Get Connection String**
   - Go to "Clusters" and click "Connect"
   - Choose "Connect your application"
   - Copy the connection string

### 4. Environment Configuration

1. **Server Environment Variables**
   - Copy the `.env` file and update with your MongoDB Atlas credentials:

```env
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/khana-lineup?retryWrites=true&w=majority
DB_NAME=khana-lineup

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret (for future authentication)
JWT_SECRET=your-secret-key-here

# CORS Origin
CORS_ORIGIN=http://localhost:5173
```

2. **Frontend Environment Variables**
   - The `.env.local` file is already configured for development:

```env
VITE_API_URL=http://localhost:5000/api
```

### 5. Replace MongoDB URI

In the `.env` file, replace the placeholder values in the MongoDB URI:

```env
MONGODB_URI=mongodb+srv://yourusername:yourpassword@yourcluster.mongodb.net/khana-lineup?retryWrites=true&w=majority
```

- Replace `yourusername` with your MongoDB Atlas username
- Replace `yourpassword` with your MongoDB Atlas password
- Replace `yourcluster` with your cluster name

## 🚀 Running the Application

### Development Mode (Recommended)

Run both frontend and backend simultaneously:

```bash
npm run dev:full
```

This will start:
- Backend server at `http://localhost:5000`
- Frontend dev server at `http://localhost:5173`

### Individual Commands

**Frontend only:**
```bash
npm run dev
```

**Backend only:**
```bash
npm run server:dev
```

**Production backend:**
```bash
npm run server
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/users` - Get all users
- `GET /api/auth/user/:id` - Get user by ID
- `PUT /api/auth/user/:id` - Update user profile

#### Menu Management
- `GET /api/menu` - Get all menu items
- `POST /api/menu` - Create menu item
- `PUT /api/menu/:id` - Update menu item
- `DELETE /api/menu/:id` - Delete menu item
- `PUT /api/menu/:id/stock` - Update stock
- `PUT /api/menu/:id/toggle` - Toggle availability

#### Order Management
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status
- `GET /api/orders/customer/:id` - Get customer orders
- `GET /api/orders/vendor/:id` - Get vendor orders
- `GET /api/orders/analytics/:id` - Get vendor analytics

## 🎯 Default Users

The system comes with default users for testing:

### Admin
- **Email**: `admin@khana.com`
- **Password**: `admin123`
- **Role**: Admin

### Vendor
- **Email**: `vendor@khana.com`
- **Password**: `vendor123`
- **Role**: Vendor

### Customer
- **Email**: `customer@khana.com`
- **Password**: `customer123`
- **Role**: Customer

## 🔄 Data Flow

1. **Startup**: Application attempts to connect to MongoDB Atlas
2. **Fallback**: If connection fails, falls back to local storage
3. **Real-time**: Data is synced between frontend and backend
4. **Persistence**: All data is stored in MongoDB Atlas cloud database

## 📱 Features Overview

### For Customers
- Browse menu with search and filters
- Add items to cart
- Place orders and get token numbers
- Track order status in real-time
- View order history

### For Vendors
- Manage menu items (add, edit, delete)
- Track inventory and stock levels
- Process orders through different stages
- View analytics and popular items
- Set estimated preparation times

### For Admins
- Manage all users
- View all orders across vendors
- Access system-wide analytics
- Monitor application health

## 🛡️ Security Features

- Password hashing with bcrypt
- Input validation and sanitization
- MongoDB injection protection
- CORS configuration
- Environment variable protection

## 🔧 Troubleshooting

### MongoDB Connection Issues

1. **Check Connection String**: Ensure the MongoDB URI is correct
2. **Network Access**: Verify IP whitelist in MongoDB Atlas
3. **Credentials**: Confirm username and password are correct
4. **Firewall**: Check if your network blocks MongoDB ports

### Local Development Issues

1. **Port Conflicts**: Ensure ports 5000 and 5173 are available
2. **Environment Variables**: Check if `.env` files are properly configured
3. **Dependencies**: Run `npm install` if you encounter module errors

### Common Error Messages

- **"Cannot connect to MongoDB"**: Check your internet connection and MongoDB Atlas configuration
- **"Port already in use"**: Kill processes using ports 5000 or 5173
- **"CORS error"**: Verify the CORS_ORIGIN in your `.env` file

## 📈 Performance Optimization

- Database indexing for faster queries
- Connection pooling for MongoDB
- Efficient React rendering with proper state management
- Lazy loading and code splitting (ready for implementation)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support
## 🚀 Production Deployment

This application is ready for production deployment on Vercel with zero configuration needed.

### Quick Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Framework preset: Vite (auto-detected)
   - Deploy!

3. **Configure Environment Variables:**
   Add these in your Vercel dashboard (Settings > Environment Variables):
   ```
   VITE_API_URL=https://your-app.vercel.app/api
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_secure_jwt_secret
   ```

4. **Complete Setup:**
   - Enable Google Auth in Firebase Console
   - Add your Vercel domain to Firebase authorized domains
   - Whitelist Vercel IPs in MongoDB Atlas (0.0.0.0/0)

📖 **Detailed Instructions:** See [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

### Security Features ✅
- No hardcoded API keys or secrets
- Environment variable configuration
- Production-safe Firebase setup
- Secure password hashing
- CORS protection
- Input validation

If you encounter any issues:

1. Check the troubleshooting section above
2. Ensure all environment variables are correctly set
3. Verify MongoDB Atlas configuration
4. Check the console for error messages

For additional support, please open an issue in the repository.

## 🔮 Future Enhancements

- Real-time notifications with WebSockets
- Payment gateway integration
- Mobile app development
- Advanced analytics and reporting
- Multi-restaurant support
- Delivery tracking
- Rating and review system
Line mein mt lag Khana Line-up kar

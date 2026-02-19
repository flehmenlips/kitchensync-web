import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { CustomerAuthProvider, useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { queryClient } from "@/lib/queryClient";
import { LoginPage } from "@/components/auth/LoginPage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BusinessDashboardLayout } from "@/components/layout/BusinessDashboardLayout";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { DashboardHome } from "@/pages/DashboardHome";
import { SharedRecipesPage } from "@/pages/SharedRecipesPage";
import { MyRecipesPage } from "@/pages/MyRecipesPage";
import { TipsTutorialsPage } from "@/pages/TipsTutorialsPage";
import { UsersPage } from "@/pages/UsersPage";
import { AdminUsersPage } from "@/pages/AdminUsersPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { ActivityLogPage } from "@/pages/ActivityLogPage";
import { FeaturedPage } from "@/pages/FeaturedPage";
import { ModerationPage } from "@/pages/ModerationPage";
import { PostModerationPage } from "@/pages/PostModerationPage";
import { CreatorVerificationPage } from "@/pages/CreatorVerificationPage";
import { ProductsPage } from "@/pages/ProductsPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { PayoutsPage } from "@/pages/PayoutsPage";
import { BusinessesPage } from "@/pages/BusinessesPage";
import NotFound from "./pages/NotFound";
import { LandingPage } from "./pages/LandingPage";
import { Loader2 } from "lucide-react";

// Business Console Pages
import { DashboardPage as BusinessDashboardPage } from "@/pages/business/DashboardPage";
import { ReservationsPage } from "@/pages/business/ReservationsPage";
import { BusinessOrdersPage } from "@/pages/business/OrdersPage";
import { MenuPage } from "@/pages/business/MenuPage";
import { CustomersPage } from "@/pages/business/CustomersPage";
import { TeamPage } from "@/pages/business/TeamPage";
import { BusinessSettingsPage } from "@/pages/business/SettingsPage";
import { BusinessAnalyticsPage } from "@/pages/business/AnalyticsPage";
import { BusinessPostsPage } from "@/pages/business/PostsPage";
import { BusinessLoginPage } from "@/pages/business/LoginPage";
import { SignupPage as BusinessSignupPage } from "@/pages/business/SignupPage";
import { EmailVerificationPage } from "@/pages/business/EmailVerificationPage";

// Public Pages
import { ReservationBookingPage } from "@/pages/ReservationBookingPage";
import { RegisterPage as BusinessRegisterPage } from "@/pages/business/RegisterPage";

// Customer App Pages (lazy loaded)
const CustomerFeedPage = lazy(() => import("@/pages/app/FeedPage").then(m => ({ default: m.FeedPage })));
const CustomerExplorePage = lazy(() => import("@/pages/app/ExplorePage").then(m => ({ default: m.ExplorePage })));
const CustomerMarketPage = lazy(() => import("@/pages/app/MarketPage").then(m => ({ default: m.MarketPage })));
const CustomerRecipesPage = lazy(() => import("@/pages/app/RecipesPage").then(m => ({ default: m.RecipesPage })));
const CustomerRecipeDetailPage = lazy(() => import("@/pages/app/RecipeDetailPage").then(m => ({ default: m.RecipeDetailPage })));
const CustomerRecipeEditorPage = lazy(() => import("@/pages/app/RecipeEditorPage").then(m => ({ default: m.RecipeEditorPage })));
const CustomerListsPage = lazy(() => import("@/pages/app/ListsPage").then(m => ({ default: m.ListsPage })));
const CustomerListDetailPage = lazy(() => import("@/pages/app/ListDetailPage").then(m => ({ default: m.ListDetailPage })));
const CustomerMenusPage = lazy(() => import("@/pages/app/MenusPage").then(m => ({ default: m.MenusPage })));
const CustomerMenuDetailPage = lazy(() => import("@/pages/app/MenuDetailPage").then(m => ({ default: m.MenuDetailPage })));
const CustomerProfilePage = lazy(() => import("@/pages/app/ProfilePage").then(m => ({ default: m.ProfilePage })));
const CustomerSettingsPage = lazy(() => import("@/pages/app/SettingsPage").then(m => ({ default: m.SettingsPage })));
const CustomerNotificationsPage = lazy(() => import("@/pages/app/NotificationsPage").then(m => ({ default: m.NotificationsPage })));
const CustomerBusinessProfilePage = lazy(() => import("@/pages/app/BusinessProfilePage").then(m => ({ default: m.BusinessProfilePage })));
const CustomerUserProfilePage = lazy(() => import("@/pages/app/UserProfilePage").then(m => ({ default: m.UserProfilePage })));
const CustomerDiscoverUsersPage = lazy(() => import("@/pages/app/DiscoverUsersPage").then(m => ({ default: m.DiscoverUsersPage })));
const CustomerCommunityRecipePage = lazy(() => import("@/pages/app/CommunityRecipePage").then(m => ({ default: m.CommunityRecipePage })));
const CustomerTipsPage = lazy(() => import("@/pages/app/TipsPage").then(m => ({ default: m.TipsPage })));
const CustomerAIRecipePage = lazy(() => import("@/pages/app/AIRecipePage").then(m => ({ default: m.AIRecipePage })));
const CustomerImportRecipePage = lazy(() => import("@/pages/app/ImportRecipePage").then(m => ({ default: m.ImportRecipePage })));
const CustomerBusinessMenuPage = lazy(() => import("@/pages/app/BusinessMenuPage").then(m => ({ default: m.BusinessMenuPage })));
const CustomerCartPage = lazy(() => import("@/pages/app/CartPage").then(m => ({ default: m.CartPage })));
const CustomerCheckoutPage = lazy(() => import("@/pages/app/CheckoutPage").then(m => ({ default: m.CheckoutPage })));
const CustomerOrderConfirmedPage = lazy(() => import("@/pages/app/OrderConfirmedPage").then(m => ({ default: m.OrderConfirmedPage })));
const CustomerFollowersPage = lazy(() => import("@/pages/app/FollowersPage").then(m => ({ default: m.FollowersPage })));
const CustomerFollowRequestsPage = lazy(() => import("@/pages/app/FollowRequestsPage").then(m => ({ default: m.FollowRequestsPage })));
const CustomerInboxPage = lazy(() => import("@/pages/app/InboxPage").then(m => ({ default: m.InboxPage })));
const CustomerAIMenuPage = lazy(() => import("@/pages/app/AIMenuPage").then(m => ({ default: m.AIMenuPage })));
const CustomerAssetLibraryPage = lazy(() => import("@/pages/app/AssetLibraryPage").then(m => ({ default: m.AssetLibraryPage })));
const CustomerFeaturedRecipesPage = lazy(() => import("@/pages/app/FeaturedRecipesPage").then(m => ({ default: m.FeaturedRecipesPage })));
const CustomerReservationPage = lazy(() => import("@/pages/app/ReservationPage").then(m => ({ default: m.ReservationPage })));
const CustomerLoginPage = lazy(() => import("@/pages/app/LoginPage").then(m => ({ default: m.CustomerLoginPage })));
const CustomerSignupPage = lazy(() => import("@/pages/app/SignupPage").then(m => ({ default: m.CustomerSignupPage })));
const CustomerCreatePostPage = lazy(() => import("@/pages/app/CreatePostPage").then(m => ({ default: m.CreatePostPage })));
const CustomerPostDetailPage = lazy(() => import("@/pages/app/PostDetailPage").then(m => ({ default: m.PostDetailPage })));

// queryClient is imported from @/lib/queryClient

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

// Business routes require Supabase auth
function BusinessProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not logged in, redirect to business login page
  if (!user) {
    return <BusinessLoginPage />;
  }

  return <BusinessProvider>{children}</BusinessProvider>;
}

// Customer routes require Supabase auth
function CustomerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useCustomerAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Suspense fallback={<LoadingSpinner />}><CustomerLoginPage /></Suspense>;
  }

  return <>{children}</>;
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Admin/Business routes - wrapped in AuthProvider
function AdminBusinessRoutes() {
  return (
    <AuthProvider>
      <Routes>
        {/* Admin Console Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="my-recipes" element={<MyRecipesPage />} />
          <Route path="recipes" element={<SharedRecipesPage />} />
          <Route path="tips" element={<TipsTutorialsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="featured" element={<FeaturedPage />} />
          <Route path="admins" element={<AdminUsersPage />} />
          <Route path="activity" element={<ActivityLogPage />} />
          <Route path="moderation" element={<ModerationPage />} />
          <Route path="post-moderation" element={<PostModerationPage />} />
          <Route path="creators" element={<CreatorVerificationPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="payouts" element={<PayoutsPage />} />
          <Route path="businesses" element={<BusinessesPage />} />
        </Route>

        {/* Business Console Routes */}
        <Route
          path="/business"
          element={
            <BusinessProtectedRoute>
              <BusinessDashboardLayout />
            </BusinessProtectedRoute>
          }
        >
          <Route index element={<BusinessDashboardPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="orders" element={<BusinessOrdersPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="posts" element={<BusinessPostsPage />} />
          <Route path="settings" element={<BusinessSettingsPage />} />
          <Route path="analytics" element={<BusinessAnalyticsPage />} />
        </Route>

        {/* Public business pages */}
        <Route path="/business/login" element={<BusinessLoginPage />} />
        <Route path="/business/signup" element={<BusinessSignupPage />} />
        <Route path="/business/verify-email" element={<EmailVerificationPage />} />
        <Route path="/business/register" element={<BusinessRegisterPage />} />

        {/* Catch-all for admin/business */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

// Customer app routes - wrapped in CustomerAuthProvider (NO AuthProvider)
function CustomerAppRoutes() {
  return (
    <CustomerAuthProvider>
      <Routes>
        <Route path="login" element={<Suspense fallback={<LoadingSpinner />}><CustomerLoginPage /></Suspense>} />
        <Route path="signup" element={<Suspense fallback={<LoadingSpinner />}><CustomerSignupPage /></Suspense>} />
        <Route
          path="/"
          element={
            <CustomerProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <CustomerLayout />
              </Suspense>
            </CustomerProtectedRoute>
          }
        >
          <Route index element={<Suspense fallback={<LoadingSpinner />}><CustomerFeedPage /></Suspense>} />
          <Route path="explore" element={<Suspense fallback={<LoadingSpinner />}><CustomerExplorePage /></Suspense>} />
          <Route path="market" element={<Suspense fallback={<LoadingSpinner />}><CustomerMarketPage /></Suspense>} />
          <Route path="recipes" element={<Suspense fallback={<LoadingSpinner />}><CustomerRecipesPage /></Suspense>} />
          <Route path="recipes/new" element={<Suspense fallback={<LoadingSpinner />}><CustomerRecipeEditorPage /></Suspense>} />
          <Route path="recipes/ai" element={<Suspense fallback={<LoadingSpinner />}><CustomerAIRecipePage /></Suspense>} />
          <Route path="recipes/import" element={<Suspense fallback={<LoadingSpinner />}><CustomerImportRecipePage /></Suspense>} />
          <Route path="recipes/:id" element={<Suspense fallback={<LoadingSpinner />}><CustomerRecipeDetailPage /></Suspense>} />
          <Route path="recipes/:id/edit" element={<Suspense fallback={<LoadingSpinner />}><CustomerRecipeEditorPage /></Suspense>} />
          <Route path="lists" element={<Suspense fallback={<LoadingSpinner />}><CustomerListsPage /></Suspense>} />
          <Route path="lists/:id" element={<Suspense fallback={<LoadingSpinner />}><CustomerListDetailPage /></Suspense>} />
          <Route path="menus" element={<Suspense fallback={<LoadingSpinner />}><CustomerMenusPage /></Suspense>} />
          <Route path="menus/ai" element={<Suspense fallback={<LoadingSpinner />}><CustomerAIMenuPage /></Suspense>} />
          <Route path="menus/:id" element={<Suspense fallback={<LoadingSpinner />}><CustomerMenuDetailPage /></Suspense>} />
          <Route path="me" element={<Suspense fallback={<LoadingSpinner />}><CustomerProfilePage /></Suspense>} />
          <Route path="me/settings" element={<Suspense fallback={<LoadingSpinner />}><CustomerSettingsPage /></Suspense>} />
          <Route path="me/notifications" element={<Suspense fallback={<LoadingSpinner />}><CustomerNotificationsPage /></Suspense>} />
          <Route path="business/:id" element={<Suspense fallback={<LoadingSpinner />}><CustomerBusinessProfilePage /></Suspense>} />
          <Route path="business/:id/menu" element={<Suspense fallback={<LoadingSpinner />}><CustomerBusinessMenuPage /></Suspense>} />
          <Route path="business/:id/reserve" element={<Suspense fallback={<LoadingSpinner />}><CustomerReservationPage /></Suspense>} />
          <Route path="cart" element={<Suspense fallback={<LoadingSpinner />}><CustomerCartPage /></Suspense>} />
          <Route path="checkout" element={<Suspense fallback={<LoadingSpinner />}><CustomerCheckoutPage /></Suspense>} />
          <Route path="order-confirmed" element={<Suspense fallback={<LoadingSpinner />}><CustomerOrderConfirmedPage /></Suspense>} />
          <Route path="user/:id" element={<Suspense fallback={<LoadingSpinner />}><CustomerUserProfilePage /></Suspense>} />
          <Route path="discover" element={<Suspense fallback={<LoadingSpinner />}><CustomerDiscoverUsersPage /></Suspense>} />
          <Route path="community/:id" element={<Suspense fallback={<LoadingSpinner />}><CustomerCommunityRecipePage /></Suspense>} />
          <Route path="create-post" element={<Suspense fallback={<LoadingSpinner />}><CustomerCreatePostPage /></Suspense>} />
          <Route path="post/:id" element={<Suspense fallback={<LoadingSpinner />}><CustomerPostDetailPage /></Suspense>} />
          <Route path="search" element={<Suspense fallback={<LoadingSpinner />}><CustomerDiscoverUsersPage /></Suspense>} />
          <Route path="tips" element={<Suspense fallback={<LoadingSpinner />}><CustomerTipsPage /></Suspense>} />
          <Route path="followers/:id" element={<Suspense fallback={<LoadingSpinner />}><CustomerFollowersPage /></Suspense>} />
          <Route path="followers" element={<Suspense fallback={<LoadingSpinner />}><CustomerFollowersPage /></Suspense>} />
          <Route path="follow-requests" element={<Suspense fallback={<LoadingSpinner />}><CustomerFollowRequestsPage /></Suspense>} />
          <Route path="inbox" element={<Suspense fallback={<LoadingSpinner />}><CustomerInboxPage /></Suspense>} />
          <Route path="assets" element={<Suspense fallback={<LoadingSpinner />}><CustomerAssetLibraryPage /></Suspense>} />
          <Route path="featured" element={<Suspense fallback={<LoadingSpinner />}><CustomerFeaturedRecipesPage /></Suspense>} />
        </Route>
      </Routes>
    </CustomerAuthProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Landing Page - no auth provider needed */}
      <Route path="/" element={<LandingPage />} />

      {/* Public reservation page */}
      <Route path="/reserve/:businessSlug" element={<ReservationBookingPage />} />

      {/* Customer Web App - only CustomerAuthProvider (no admin AuthProvider) */}
      <Route path="/app/*" element={<CustomerAppRoutes />} />

      {/* Admin, Business, and other routes - only admin AuthProvider */}
      <Route path="*" element={<AdminBusinessRoutes />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

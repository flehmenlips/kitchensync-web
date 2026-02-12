import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { LoginPage } from "@/components/auth/LoginPage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BusinessDashboardLayout } from "@/components/layout/BusinessDashboardLayout";
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
import { BusinessLoginPage } from "@/pages/business/LoginPage";
import { SignupPage as BusinessSignupPage } from "@/pages/business/SignupPage";
import { EmailVerificationPage } from "@/pages/business/EmailVerificationPage";

// Public Pages
import { ReservationBookingPage } from "@/pages/ReservationBookingPage";
import { RegisterPage as BusinessRegisterPage } from "@/pages/business/RegisterPage";

const queryClient = new QueryClient();

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

function AppRoutes() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

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
        <Route path="settings" element={<BusinessSettingsPage />} />
        <Route path="analytics" element={<BusinessAnalyticsPage />} />
      </Route>

      {/* Public Pages (no auth required) */}
      <Route path="/business/login" element={<BusinessLoginPage />} />
      <Route path="/business/signup" element={<BusinessSignupPage />} />
      <Route path="/business/verify-email" element={<EmailVerificationPage />} />
      <Route path="/business/register" element={<BusinessRegisterPage />} />
      <Route path="/reserve/:businessSlug" element={<ReservationBookingPage />} />

      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

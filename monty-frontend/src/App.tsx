import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './features/home/HomePage';
import { AddTransactionPage } from './features/add/AddTransactionPage';
import { SettingsPage } from './pages/SettingsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HistoryPage } from './features/history/HistoryPage';
import { AllServicesPage } from './pages/AllServicesPage';
import { Layout } from './components/Layout';
import { FoodLayout } from './features/food/components/FoodLayout';
import { TodayPage } from './features/food/TodayPage';
import { MenuPage } from './features/food/MenuPage';
import { ShoppingPage } from './features/food/ShoppingPage';
import { PantryPage } from './features/food/PantryPage';
import { RecipesPage } from './features/food/RecipesPage';
import { RecipePage } from './features/food/RecipePage';
import { RecipeEditorPage } from './features/food/RecipeEditorPage';
import { TransferNewPage } from './features/food/TransferNewPage';
import { TransfersPage } from './features/food/TransfersPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="transactions" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="services" element={<AllServicesPage />} />
        <Route path="food" element={<FoodLayout />}>
          <Route index element={<TodayPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="shopping" element={<ShoppingPage />} />
          <Route path="pantry" element={<PantryPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="recipes/new" element={<RecipeEditorPage />} />
          <Route path="recipes/:id" element={<RecipePage />} />
          <Route path="recipes/:id/edit" element={<RecipeEditorPage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="transfers/new" element={<TransferNewPage />} />
          {/* Old Food v1 routes */}
          <Route path="catalog" element={<Navigate to="/food/recipes" replace />} />
          <Route path="guide" element={<Navigate to="/food/recipes" replace />} />
        </Route>
      </Route>
      <Route
        path="/add"
        element={
          <ProtectedRoute>
            <AddTransactionPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;

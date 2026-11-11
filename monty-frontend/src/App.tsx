import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazyPage } from './lib/lazyPage';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './features/home/HomePage';
import { AddTransactionPage } from './features/add/AddTransactionPage';
import { Layout } from './components/Layout';

// Finance home + add stay in the main bundle (the first screen); the rest load on demand,
// so recharts, Food and Journal don't slow down opening the Mini App.
const SettingsPage = lazyPage(() => import('./pages/SettingsPage'), 'SettingsPage');
const NotificationsSettingsPage = lazyPage(() => import('./pages/NotificationsSettingsPage'), 'NotificationsSettingsPage');
const AnalyticsPage = lazyPage(() => import('./features/analytics/AnalyticsPage'), 'AnalyticsPage');
const HistoryPage = lazyPage(() => import('./features/history/HistoryPage'), 'HistoryPage');
const DeferredPage = lazyPage(() => import('./features/deferred/DeferredPage'), 'DeferredPage');
const AllServicesPage = lazyPage(() => import('./pages/AllServicesPage'), 'AllServicesPage');
const FoodLayout = lazyPage(() => import('./features/food/components/FoodLayout'), 'FoodLayout');
const TodayPage = lazyPage(() => import('./features/food/TodayPage'), 'TodayPage');
const MenuPage = lazyPage(() => import('./features/food/MenuPage'), 'MenuPage');
const ShoppingPage = lazyPage(() => import('./features/food/ShoppingPage'), 'ShoppingPage');
const PantryPage = lazyPage(() => import('./features/food/PantryPage'), 'PantryPage');
const RecipesPage = lazyPage(() => import('./features/food/RecipesPage'), 'RecipesPage');
const RecipePage = lazyPage(() => import('./features/food/RecipePage'), 'RecipePage');
const RecipeEditorPage = lazyPage(() => import('./features/food/RecipeEditorPage'), 'RecipeEditorPage');
const TransferNewPage = lazyPage(() => import('./features/food/TransferNewPage'), 'TransferNewPage');
const TransfersPage = lazyPage(() => import('./features/food/TransfersPage'), 'TransfersPage');
const JournalLayout = lazyPage(() => import('./features/journal/components/JournalLayout'), 'JournalLayout');
const JournalTodayPage = lazyPage(() => import('./features/journal/TodayPage'), 'JournalTodayPage');
const JournalHistoryPage = lazyPage(() => import('./features/journal/HistoryPage'), 'JournalHistoryPage');
const JournalEntryPage = lazyPage(() => import('./features/journal/EntryPage'), 'JournalEntryPage');
const JournalAnalyticsPage = lazyPage(() => import('./features/journal/AnalyticsPage'), 'JournalAnalyticsPage');
const JournalSettingsPage = lazyPage(() => import('./features/journal/SettingsPage'), 'JournalSettingsPage');

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
    <Suspense fallback={null}>
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
        <Route path="settings/notifications" element={<NotificationsSettingsPage />} />
        <Route path="deferred" element={<DeferredPage />} />
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
        <Route path="journal" element={<JournalLayout />}>
          <Route index element={<JournalTodayPage />} />
          <Route path="history" element={<JournalHistoryPage />} />
          <Route path="analytics" element={<JournalAnalyticsPage />} />
          <Route path="settings" element={<JournalSettingsPage />} />
          <Route path="entries/:id" element={<JournalEntryPage />} />
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
    </Suspense>
  );
}

export default App;

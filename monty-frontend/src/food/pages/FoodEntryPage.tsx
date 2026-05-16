import { useEffect, useState } from 'react';
import { Container, LoadingOverlay } from '@mantine/core';
import { Navigate } from 'react-router-dom';
import { foodApi } from '../../services/food';

export function FoodEntryPage() {
  const [target, setTarget] = useState<'menu' | 'catalog' | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { dish_count } = await foodApi.bootstrap.get();
        if (cancelled) return;
        setTarget(dish_count >= 3 ? 'menu' : 'catalog');
      } catch (e) {
        console.error(e);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return <Navigate to="/food/catalog" replace />;
  }

  if (target === 'menu') {
    return <Navigate to="/food/menu" replace />;
  }

  if (target === 'catalog') {
    return <Navigate to="/food/catalog" replace />;
  }

  return (
    <Container size="sm" p="md" pos="relative" style={{ minHeight: 320 }}>
      <LoadingOverlay visible />
    </Container>
  );
}

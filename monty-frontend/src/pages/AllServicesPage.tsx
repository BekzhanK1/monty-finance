import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, SimpleGrid, ThemeIcon } from '@mantine/core';
import { IconDownload, IconSettings } from '@tabler/icons-react';
import { transactionsApi } from '../services/finance';
import { ListRow, PageHeader, Section } from '../ui';
import { pageStackPb } from '../theme/dashboardChrome';
import { SERVICES, type ServiceDef } from '../features/services/catalog';
import { CatalogTile } from '../features/services/ServiceTile';
import { ComingSoonSheet } from '../features/services/ComingSoonSheet';

export function AllServicesPage() {
  const [soon, setSoon] = useState<ServiceDef | null>(null);
  const navigate = useNavigate();
  const rowIcon = (icon: React.ReactNode) => (
    <ThemeIcon size={30} radius="md" variant="light">{icon}</ThemeIcon>
  );
  const ready = SERVICES.filter(s => !s.comingSoon);
  const upcoming = SERVICES.filter(s => s.comingSoon);

  return (
    <Container size="sm" pb={pageStackPb}>
      <PageHeader title="Сервисы" />

      <Section title="Доступно" padded style={{ marginTop: 12, marginBottom: 24 }}>
        <SimpleGrid cols={4} spacing={4} verticalSpacing="md">
          {ready.map(s => <CatalogTile key={s.key} service={s} onSoon={setSoon} />)}
        </SimpleGrid>
      </Section>

      <Section title="Скоро" padded style={{ marginBottom: 24 }}>
        <SimpleGrid cols={4} spacing={4} verticalSpacing="md">
          {upcoming.map(s => <CatalogTile key={s.key} service={s} onSoon={setSoon} />)}
        </SimpleGrid>
      </Section>

      <Section title="Monty">
        <ListRow
          leading={rowIcon(<IconSettings size={18} />)}
          title="Настройки"
          subtitle="Бюджеты, цель, категории, день зарплаты"
          onClick={() => navigate('/settings')}
          chevron
        />
        <ListRow
          divider
          leading={rowIcon(<IconDownload size={18} />)}
          title="Экспорт в CSV"
          subtitle="Все операции"
          onClick={() => void transactionsApi.exportCsv()}
          chevron
        />
      </Section>

      <ComingSoonSheet service={soon} onClose={() => setSoon(null)} />
    </Container>
  );
}

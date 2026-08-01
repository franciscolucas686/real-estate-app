import { apiFetch } from '@/shared/api/api-client';
import type { SiteSettings, UpdateSiteSettingsDto } from '@/shared/api/types';

export async function fetchSiteSettings(): Promise<SiteSettings> {
  return apiFetch<SiteSettings>('/site-settings');
}

export async function updateSiteSettings(dto: UpdateSiteSettingsDto): Promise<SiteSettings> {
  return apiFetch<SiteSettings>('/site-settings', {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

import { apiFetch } from './api-client';
import type { SiteSettings, UpdateSiteSettingsDto } from '../types/api';

export async function fetchSiteSettings(): Promise<SiteSettings> {
  return apiFetch<SiteSettings>('/site-settings');
}

export async function updateSiteSettings(dto: UpdateSiteSettingsDto): Promise<SiteSettings> {
  return apiFetch<SiteSettings>('/site-settings', {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

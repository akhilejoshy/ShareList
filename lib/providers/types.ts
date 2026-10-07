export interface ProviderCandidate {
  externalId: string;
  title: string;
  coverImageUrl: string | null;
  year: string | null;
  language: string | null;
  extra: Record<string, unknown>;
}

export interface ItemData {
  externalId: string;
  title: string;
  coverImageUrl: string | null;
  bannerUrl: string | null;
  metadata: Record<string, unknown>;
}

export interface MetadataProvider {
  search(query: string, options?: { year?: string }): Promise<ProviderCandidate[]>;
  getById(externalId: string): Promise<ItemData>;
  getTrending(): Promise<ProviderCandidate[]>;
}
